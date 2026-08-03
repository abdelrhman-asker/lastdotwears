import { Injectable } from '@nestjs/common';

import type { ShippingRate as PrismaShippingRate } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { ShippingRateRecord } from '../interfaces/shipping-rate.interface.js';
import type { ShippingRepository } from '../interfaces/shipping-repository.interface.js';

function mapRate(rate: PrismaShippingRate): ShippingRateRecord {
  return { ...rate };
}

@Injectable()
export class PrismaShippingRepository implements ShippingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<ShippingRateRecord[]> {
    return (
      await this.prisma.shippingRate.findMany({
        where: { isActive: true },
        orderBy: { governorateName: 'asc' },
      })
    ).map(mapRate);
  }

  async listAdmin(): Promise<ShippingRateRecord[]> {
    return (await this.prisma.shippingRate.findMany({ orderBy: { governorateName: 'asc' } })).map(
      mapRate,
    );
  }

  async findById(id: string): Promise<ShippingRateRecord | null> {
    const rate = await this.prisma.shippingRate.findUnique({ where: { id } });
    return rate ? mapRate(rate) : null;
  }

  async create(input: Parameters<ShippingRepository['create']>[0]): Promise<ShippingRateRecord> {
    return mapRate(await this.prisma.shippingRate.create({ data: input }));
  }

  async update(
    id: string,
    input: Parameters<ShippingRepository['update']>[1],
  ): Promise<ShippingRateRecord | null> {
    const updated = await this.prisma.shippingRate.updateMany({ where: { id }, data: input });
    return updated.count === 1 ? this.findById(id) : null;
  }

  async remove(id: string): Promise<'deleted' | 'used' | 'not_found'> {
    const rate = await this.prisma.shippingRate.findUnique({
      where: { id },
      select: { _count: { select: { orders: true } } },
    });
    if (!rate) return 'not_found';
    if (rate._count.orders > 0) return 'used';
    await this.prisma.shippingRate.delete({ where: { id } });
    return 'deleted';
  }
}
