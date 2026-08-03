import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  NotEquals,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type {
  InventoryItemRecord,
  InventoryMovementRecord,
  InventoryMovementType,
} from '../interfaces/inventory.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const optionalBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class InventoryListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(120) search?: string;
  @Transform(optionalBoolean) @IsOptional() @IsBoolean() lowStock?: boolean;
}

export class InventoryAdjustmentDto {
  @ApiProperty({
    example: 12,
    description: 'Signed quantity change. Negative values remove stock.',
  })
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  @NotEquals(0)
  quantityDelta!: number;

  @ApiPropertyOptional({ enum: ['RESTOCK', 'ADJUSTMENT', 'RETURN'], default: 'ADJUSTMENT' })
  @IsOptional()
  @IsIn(['RESTOCK', 'ADJUSTMENT', 'RETURN'])
  type?: InventoryMovementType;

  @ApiProperty({ maxLength: 500 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class InventoryItemResponseDto implements InventoryItemRecord {
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() productSlug!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() size!: string;
  @ApiProperty() colorName!: string;
  @ApiProperty() stockQuantity!: number;
  @ApiProperty() lowStockThreshold!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(item: InventoryItemRecord): InventoryItemResponseDto {
    return { ...item };
  }
}

export class PaginatedInventoryResponseDto {
  @ApiProperty({ type: [InventoryItemResponseDto] }) items!: InventoryItemResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class InventoryMovementResponseDto implements InventoryMovementRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) variantId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) actorId!: string | null;
  @ApiProperty() type!: InventoryMovementType;
  @ApiProperty() quantityDelta!: number;
  @ApiProperty() quantityAfter!: number;
  @ApiPropertyOptional({ nullable: true }) reason!: string | null;
  @ApiPropertyOptional({ nullable: true }) referenceType!: string | null;
  @ApiPropertyOptional({ nullable: true }) referenceId!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;

  static from(movement: InventoryMovementRecord): InventoryMovementResponseDto {
    return { ...movement };
  }
}
