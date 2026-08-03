import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { CartItemIssue } from '../interfaces/cart.interface.js';

export class AddCartItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: 99, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity = 1;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CartProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() brandName!: string;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageAlt!: string | null;
}

export class CartVariantResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() size!: string;
  @ApiProperty() colorName!: string;
  @ApiPropertyOptional({ nullable: true }) colorHex!: string | null;
}

export class CartItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ minimum: 1, maximum: 99 }) quantity!: number;
  @ApiProperty() unitPricePiasters!: number;
  @ApiProperty() lineTotalPiasters!: number;
  @ApiProperty() maxQuantity!: number;
  @ApiProperty() isAvailable!: boolean;
  @ApiPropertyOptional({
    enum: ['UNAVAILABLE', 'OUT_OF_STOCK', 'INSUFFICIENT_STOCK'],
    nullable: true,
  })
  issue!: CartItemIssue | null;
  @ApiProperty({ type: CartProductResponseDto }) product!: CartProductResponseDto;
  @ApiProperty({ type: CartVariantResponseDto }) variant!: CartVariantResponseDto;
}

export class CartResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) id!: string | null;
  @ApiProperty({ type: [CartItemResponseDto] }) items!: CartItemResponseDto[];
  @ApiProperty() itemCount!: number;
  @ApiProperty() subtotalPiasters!: number;
  @ApiProperty() hasUnavailableItems!: boolean;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) updatedAt!: Date | null;

  static empty(): CartResponseDto {
    return {
      id: null,
      items: [],
      itemCount: 0,
      subtotalPiasters: 0,
      hasUnavailableItems: false,
      updatedAt: null,
    };
  }
}
