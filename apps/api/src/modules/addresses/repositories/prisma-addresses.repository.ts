import { Injectable } from '@nestjs/common';

import type { Address as PrismaAddress, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { AddressRecord, AddressWriteInput } from '../interfaces/address.interface.js';
import type {
  AddressesRepository,
  CreateAddressResult,
  UpdateAddressResult,
} from '../interfaces/addresses-repository.interface.js';

const maximumAddressesPerCustomer = 10;

function mapAddress(address: PrismaAddress): AddressRecord {
  return {
    id: address.id,
    userId: address.userId,
    label: address.label,
    recipientFirstName: address.recipientFirstName,
    recipientLastName: address.recipientLastName,
    phone: address.phone,
    governorateCode: address.governorateCode,
    governorateName: address.governorateName,
    city: address.city,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    postalCode: address.postalCode,
    deliveryNotes: address.deliveryNotes,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

@Injectable()
export class PrismaAddressesRepository implements AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressRecord[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return addresses.map(mapAddress);
  }

  create(userId: string, input: AddressWriteInput): Promise<CreateAddressResult> {
    return this.withTransactionRetry(async () =>
      this.prisma.$transaction(
        async (transaction) => {
          const governorate = await this.activeGovernorate(transaction, input.governorateCode);
          if (!governorate) return 'governorate_unavailable' as const;

          const count = await transaction.address.count({ where: { userId } });
          if (count >= maximumAddressesPerCustomer) return 'limit_reached' as const;

          const isDefault = count === 0 || input.isDefault === true;
          if (isDefault) {
            await transaction.address.updateMany({
              where: { userId, isDefault: true },
              data: { isDefault: false },
            });
          }

          const address = await transaction.address.create({
            data: {
              userId,
              label: input.label!,
              recipientFirstName: input.recipientFirstName!,
              recipientLastName: input.recipientLastName!,
              phone: input.phone!,
              governorateCode: governorate.governorateCode,
              governorateName: governorate.governorateName,
              city: input.city!,
              addressLine1: input.addressLine1!,
              addressLine2: this.nullable(input.addressLine2),
              postalCode: this.nullable(input.postalCode),
              deliveryNotes: this.nullable(input.deliveryNotes),
              isDefault,
            },
          });
          return mapAddress(address);
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  update(userId: string, id: string, input: AddressWriteInput): Promise<UpdateAddressResult> {
    return this.withTransactionRetry(async () =>
      this.prisma.$transaction(
        async (transaction) => {
          const current = await transaction.address.findFirst({ where: { id, userId } });
          if (!current) return 'not_found' as const;

          const governorate = input.governorateCode
            ? await this.activeGovernorate(transaction, input.governorateCode)
            : null;
          if (input.governorateCode && !governorate) {
            return 'governorate_unavailable' as const;
          }

          if (input.isDefault === true && !current.isDefault) {
            await transaction.address.updateMany({
              where: { userId, isDefault: true },
              data: { isDefault: false },
            });
          }

          const data: Prisma.AddressUncheckedUpdateInput = {
            ...(input.label !== undefined ? { label: input.label } : {}),
            ...(input.recipientFirstName !== undefined
              ? { recipientFirstName: input.recipientFirstName }
              : {}),
            ...(input.recipientLastName !== undefined
              ? { recipientLastName: input.recipientLastName }
              : {}),
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(governorate
              ? {
                  governorateCode: governorate.governorateCode,
                  governorateName: governorate.governorateName,
                }
              : {}),
            ...(input.city !== undefined ? { city: input.city } : {}),
            ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
            ...(input.addressLine2 !== undefined
              ? { addressLine2: this.nullable(input.addressLine2) }
              : {}),
            ...(input.postalCode !== undefined
              ? { postalCode: this.nullable(input.postalCode) }
              : {}),
            ...(input.deliveryNotes !== undefined
              ? { deliveryNotes: this.nullable(input.deliveryNotes) }
              : {}),
            ...(input.isDefault === true ? { isDefault: true } : {}),
          };

          const address = await transaction.address.update({ where: { id }, data });
          return mapAddress(address);
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  remove(userId: string, id: string): Promise<'deleted' | 'not_found'> {
    return this.withTransactionRetry(async () =>
      this.prisma.$transaction(
        async (transaction) => {
          const address = await transaction.address.findFirst({ where: { id, userId } });
          if (!address) return 'not_found' as const;

          await transaction.address.delete({ where: { id } });
          if (address.isDefault) {
            const replacement = await transaction.address.findFirst({
              where: { userId },
              orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
              select: { id: true },
            });
            if (replacement) {
              await transaction.address.update({
                where: { id: replacement.id },
                data: { isDefault: true },
              });
            }
          }
          return 'deleted' as const;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  private activeGovernorate(
    transaction: Prisma.TransactionClient,
    governorateCode: string | undefined,
  ) {
    if (!governorateCode) return Promise.resolve(null);
    return transaction.shippingRate.findFirst({
      where: { governorateCode, isActive: true },
      select: { governorateCode: true, governorateName: true },
    });
  }

  private nullable(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async withTransactionRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isTransactionConflict(error) || attempt === 3) throw error;
      }
    }
    throw new Error('Address transaction retry exhausted.');
  }

  private isTransactionConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2034'
    );
  }
}
