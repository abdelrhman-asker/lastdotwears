import { IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddWishlistItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;
}

export class WishlistProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() brandName!: string;
  @ApiProperty() pricePiasters!: number;
  @ApiPropertyOptional({ nullable: true }) salePricePiasters!: number | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageAlt!: string | null;
  @ApiProperty() stockQuantity!: number;
  @ApiProperty() isAvailable!: boolean;
}

export class WishlistItemResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: WishlistProductResponseDto }) product!: WishlistProductResponseDto;
}

export class WishlistResponseDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) id!: string | null;
  @ApiProperty({ type: [WishlistItemResponseDto] }) items!: WishlistItemResponseDto[];
  @ApiProperty() itemCount!: number;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) updatedAt!: Date | null;

  static empty(): WishlistResponseDto {
    return { id: null, items: [], itemCount: 0, updatedAt: null };
  }
}
