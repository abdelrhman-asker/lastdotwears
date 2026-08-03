import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ShippingRateRecord } from '../interfaces/shipping-rate.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const code = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateShippingRateDto {
  @ApiProperty({ example: 'cairo' })
  @Transform(code)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @MaxLength(40)
  governorateCode!: string;

  @ApiProperty({ example: 'Cairo' })
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  governorateName!: string;

  @ApiProperty({ example: 6000, description: 'Shipping fee in Egyptian piasters.' })
  @IsInt()
  @Min(0)
  feePiasters!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(60)
  estimatedMinDays!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(60)
  estimatedMaxDays!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShippingRateDto {
  @Transform(code)
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  @MaxLength(40)
  governorateCode?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  governorateName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  feePiasters?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  estimatedMinDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  estimatedMaxDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ShippingRateResponseDto implements ShippingRateRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() governorateCode!: string;
  @ApiProperty() governorateName!: string;
  @ApiProperty() feePiasters!: number;
  @ApiProperty() estimatedMinDays!: number;
  @ApiProperty() estimatedMaxDays!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(record: ShippingRateRecord): ShippingRateResponseDto {
    return { ...record };
  }
}
