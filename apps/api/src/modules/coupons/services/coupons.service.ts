import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import type {
  CreateCouponDto,
  ListCouponsQueryDto,
  PaginatedCouponsResponseDto,
  UpdateCouponDto,
} from '../dto/coupon.dto.js';
import { CouponResponseDto } from '../dto/coupon.dto.js';
import {
  COUPONS_REPOSITORY,
  type CouponsRepository,
} from '../interfaces/coupons-repository.interface.js';
import type { CouponWriteInput } from '../interfaces/coupon.interface.js';

@Injectable()
export class CouponsService {
  constructor(@Inject(COUPONS_REPOSITORY) private readonly repository: CouponsRepository) {}

  async list(query: ListCouponsQueryDto): Promise<PaginatedCouponsResponseDto> {
    const result = await this.repository.list({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    });
    return {
      items: result.items.map((coupon) => CouponResponseDto.from(coupon)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async get(id: string): Promise<CouponResponseDto> {
    const coupon = await this.repository.findById(id);
    if (!coupon) throw new NotFoundException('Coupon not found.');
    return CouponResponseDto.from(coupon);
  }

  async create(input: CreateCouponDto): Promise<CouponResponseDto> {
    const write = this.toWrite(input);
    this.assertValid(write);
    try {
      return CouponResponseDto.from(await this.repository.create(write));
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) throw new ConflictException('Coupon code already exists.');
      throw error;
    }
  }

  async update(id: string, input: UpdateCouponDto): Promise<CouponResponseDto> {
    const current = await this.get(id);
    const write: CouponWriteInput = {
      code: input.code ?? current.code,
      description:
        input.description === undefined ? current.description : input.description || null,
      discountType: input.discountType ?? current.discountType,
      value: input.value ?? current.value,
      minimumSubtotalPiasters: input.minimumSubtotalPiasters ?? current.minimumSubtotalPiasters,
      maximumDiscountPiasters:
        input.maximumDiscountPiasters === undefined
          ? current.maximumDiscountPiasters
          : input.maximumDiscountPiasters,
      startsAt:
        input.startsAt === undefined
          ? current.startsAt
          : input.startsAt
            ? new Date(input.startsAt)
            : null,
      endsAt:
        input.endsAt === undefined ? current.endsAt : input.endsAt ? new Date(input.endsAt) : null,
      usageLimit: input.usageLimit === undefined ? current.usageLimit : input.usageLimit,
      perCustomerLimit: input.perCustomerLimit ?? current.perCustomerLimit,
      isActive: input.isActive ?? current.isActive,
    };
    this.assertValid(write, current.timesUsed);
    try {
      const coupon = await this.repository.update(id, write);
      if (!coupon) throw new NotFoundException('Coupon not found.');
      return CouponResponseDto.from(coupon);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) throw new ConflictException('Coupon code already exists.');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.remove(id);
    if (result === 'not_found') throw new NotFoundException('Coupon not found.');
    if (result === 'used') {
      throw new ConflictException('Used coupons must be deactivated instead of deleted.');
    }
  }

  private toWrite(input: CreateCouponDto): CouponWriteInput {
    return {
      code: input.code,
      description: input.description || null,
      discountType: input.discountType,
      value: input.value,
      minimumSubtotalPiasters: input.minimumSubtotalPiasters ?? 0,
      maximumDiscountPiasters: input.maximumDiscountPiasters ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      usageLimit: input.usageLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? 1,
      isActive: input.isActive ?? true,
    };
  }

  private assertValid(input: CouponWriteInput, timesUsed = 0): void {
    if (input.discountType === 'PERCENTAGE' && input.value > 100) {
      throw new BadRequestException('Percentage coupons cannot exceed 100%.');
    }
    if (input.startsAt && input.endsAt && input.startsAt >= input.endsAt) {
      throw new BadRequestException('Coupon end time must be after its start time.');
    }
    if (input.usageLimit !== null && input.usageLimit < timesUsed) {
      throw new BadRequestException('Usage limit cannot be lower than existing redemptions.');
    }
  }
}
