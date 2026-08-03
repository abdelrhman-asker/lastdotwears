import { Injectable } from '@nestjs/common';

import type { Coupon as PrismaCoupon, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { CouponRecord } from '../interfaces/coupon.interface.js';
import type { CouponsRepository } from '../interfaces/coupons-repository.interface.js';

function mapCoupon(coupon: PrismaCoupon): CouponRecord {
  return { ...coupon };
}

@Injectable()
export class PrismaCouponsRepository implements CouponsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: Parameters<CouponsRepository['list']>[0]) {
    const where: Prisma.CouponWhereInput = {
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.search
        ? {
            OR: [
              { code: { contains: input.search, mode: 'insensitive' } },
              { description: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.coupon.count({ where }),
    ]);
    return { items: items.map(mapCoupon), total };
  }

  async findById(id: string): Promise<CouponRecord | null> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    return coupon ? mapCoupon(coupon) : null;
  }

  async create(input: Parameters<CouponsRepository['create']>[0]): Promise<CouponRecord> {
    return mapCoupon(await this.prisma.coupon.create({ data: input }));
  }

  async update(
    id: string,
    input: Parameters<CouponsRepository['update']>[1],
  ): Promise<CouponRecord | null> {
    const updated = await this.prisma.coupon.updateMany({ where: { id }, data: input });
    return updated.count === 1 ? this.findById(id) : null;
  }

  async remove(id: string): Promise<'deleted' | 'used' | 'not_found'> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      select: { _count: { select: { redemptions: true } } },
    });
    if (!coupon) return 'not_found';
    if (coupon._count.redemptions > 0) return 'used';
    await this.prisma.coupon.delete({ where: { id } });
    return 'deleted';
  }
}
