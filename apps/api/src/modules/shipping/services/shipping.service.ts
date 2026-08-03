import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import type { CreateShippingRateDto, UpdateShippingRateDto } from '../dto/shipping.dto.js';
import { ShippingRateResponseDto } from '../dto/shipping.dto.js';
import {
  SHIPPING_REPOSITORY,
  type ShippingRepository,
} from '../interfaces/shipping-repository.interface.js';
import type { ShippingRateWriteInput } from '../interfaces/shipping-rate.interface.js';

@Injectable()
export class ShippingService {
  constructor(@Inject(SHIPPING_REPOSITORY) private readonly repository: ShippingRepository) {}

  async listPublic(): Promise<ShippingRateResponseDto[]> {
    return (await this.repository.listPublic()).map((rate) => ShippingRateResponseDto.from(rate));
  }

  async listAdmin(): Promise<ShippingRateResponseDto[]> {
    return (await this.repository.listAdmin()).map((rate) => ShippingRateResponseDto.from(rate));
  }

  async get(id: string): Promise<ShippingRateResponseDto> {
    const rate = await this.repository.findById(id);
    if (!rate) throw new NotFoundException('Shipping rate not found.');
    return ShippingRateResponseDto.from(rate);
  }

  async create(input: CreateShippingRateDto): Promise<ShippingRateResponseDto> {
    const write: ShippingRateWriteInput = { ...input, isActive: input.isActive ?? true };
    this.assertDays(write.estimatedMinDays, write.estimatedMaxDays);
    try {
      return ShippingRateResponseDto.from(await this.repository.create(write));
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A shipping rate already exists for this governorate.');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateShippingRateDto): Promise<ShippingRateResponseDto> {
    const current = await this.get(id);
    const write: ShippingRateWriteInput = {
      governorateCode: input.governorateCode ?? current.governorateCode,
      governorateName: input.governorateName ?? current.governorateName,
      feePiasters: input.feePiasters ?? current.feePiasters,
      estimatedMinDays: input.estimatedMinDays ?? current.estimatedMinDays,
      estimatedMaxDays: input.estimatedMaxDays ?? current.estimatedMaxDays,
      isActive: input.isActive ?? current.isActive,
    };
    this.assertDays(write.estimatedMinDays, write.estimatedMaxDays);
    try {
      const rate = await this.repository.update(id, write);
      if (!rate) throw new NotFoundException('Shipping rate not found.');
      return ShippingRateResponseDto.from(rate);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException('A shipping rate already exists for this governorate.');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.remove(id);
    if (result === 'not_found') throw new NotFoundException('Shipping rate not found.');
    if (result === 'used') {
      throw new ConflictException('Used shipping rates must be deactivated instead of deleted.');
    }
  }

  private assertDays(minimum: number, maximum: number): void {
    if (maximum < minimum) {
      throw new BadRequestException('Maximum delivery days cannot be lower than minimum days.');
    }
  }
}
