import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { CouponRecord } from '../interfaces/coupon.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const couponCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const optionalBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @Transform(couponCode)
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/u)
  code!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT'] })
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @ApiProperty({ description: 'Whole percent or fixed Egyptian piasters.' })
  @IsInt()
  @Min(1)
  value!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumSubtotalPiasters?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maximumDiscountPiasters?: number | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perCustomerLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @Transform(couponCode)
  @IsOptional()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/u)
  code?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumSubtotalPiasters?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumDiscountPiasters?: number | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perCustomerLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListCouponsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Transform(optionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CouponResponseDto implements CouponRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() code!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT'] })
  discountType!: 'PERCENTAGE' | 'FIXED_AMOUNT';
  @ApiProperty() value!: number;
  @ApiProperty() minimumSubtotalPiasters!: number;
  @ApiPropertyOptional({ nullable: true }) maximumDiscountPiasters!: number | null;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) startsAt!: Date | null;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) endsAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) usageLimit!: number | null;
  @ApiProperty() perCustomerLimit!: number;
  @ApiProperty() timesUsed!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(record: CouponRecord): CouponResponseDto {
    return { ...record };
  }
}

export class PaginatedCouponsResponseDto {
  @ApiProperty({ type: [CouponResponseDto] }) items!: CouponResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
