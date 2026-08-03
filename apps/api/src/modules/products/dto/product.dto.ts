import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { slugPattern } from '../../../common/utils/catalog-normalization.util.js';
import type {
  ProductImageRecord,
  ProductListQuery,
  ProductRecord,
  ProductStatus,
  ProductVariantRecord,
} from '../interfaces/product.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const optionalBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};
const skuPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class CreateProductVariantDto {
  @ApiProperty({ example: 'TSHIRT-BLK-M' })
  @Transform(trim)
  @Matches(skuPattern)
  @MaxLength(80)
  sku!: string;

  @ApiProperty({ example: 'M' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  size!: string;

  @ApiProperty({ example: 'Black' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  colorName!: string;

  @ApiPropertyOptional({ example: '#111111', nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsHexColor()
  colorHex?: string | null;

  @ApiPropertyOptional({ minimum: 1, nullable: true, description: 'Integer Egyptian piasters.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceOverridePiasters?: number | null;

  @ApiProperty({ minimum: 0, default: 0 })
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @ApiPropertyOptional({ minimum: 0, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateProductVariantDto {
  @Transform(trim)
  @IsOptional()
  @Matches(skuPattern)
  @MaxLength(80)
  sku?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  size?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  colorName?: string;

  @Transform(trim)
  @IsOptional()
  @IsHexColor()
  colorHex?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  priceOverridePiasters?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Relaxed Cotton Shirt' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @ApiPropertyOptional({ example: 'relaxed-cotton-shirt' })
  @Transform(trim)
  @IsOptional()
  @Matches(slugPattern)
  @MaxLength(200)
  slug?: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  description!: string;

  @ApiProperty({ example: 149900, description: 'Integer Egyptian piasters (EGP 1,499.00).' })
  @IsInt()
  @Min(1)
  pricePiasters!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  salePricePiasters?: number | null;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  brandId!: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE'], default: 'DRAFT' })
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE'])
  status?: ProductStatus;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants!: CreateProductVariantDto[];
}

export class UpdateProductDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @Transform(trim)
  @IsOptional()
  @Matches(slugPattern)
  @MaxLength(200)
  slug?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pricePiasters?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  salePricePiasters?: number | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;
}

export class ProductListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(60) limit = 24;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(120) search?: string;
  @Transform(trim) @IsOptional() @Matches(slugPattern) category?: string;
  @Transform(trim) @IsOptional() @Matches(slugPattern) brand?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(40) size?: string;
  @Transform(trim) @IsOptional() @IsString() @MaxLength(80) color?: string;
  @Transform(optionalBoolean) @IsOptional() @IsBoolean() featured?: boolean;
  @Transform(optionalBoolean) @IsOptional() @IsBoolean() newArrival?: boolean;
  @Type(() => Number) @IsOptional() @IsInt() @Min(0) minPrice?: number;
  @Type(() => Number) @IsOptional() @IsInt() @Min(1) maxPrice?: number;
  @IsOptional()
  @IsIn(['newest', 'oldest', 'price-asc', 'price-desc', 'name-asc'])
  sort: ProductListQuery['sort'] = 'newest';
}

export class AdminProductListQueryDto extends ProductListQueryDto {
  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED'])
  status?: ProductStatus;
}

export class UpdateProductImageDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UploadProductImageDto {
  @ApiProperty({ example: 'Model wearing relaxed black cotton shirt' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  altText!: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @Transform(optionalBoolean)
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class ProductVariantResponseDto implements ProductVariantRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() size!: string;
  @ApiProperty() colorName!: string;
  @ApiPropertyOptional({ nullable: true }) colorHex!: string | null;
  @ApiPropertyOptional({ nullable: true }) priceOverridePiasters!: number | null;
  @ApiProperty() stockQuantity!: number;
  @ApiProperty() lowStockThreshold!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() position!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(variant: ProductVariantRecord): ProductVariantResponseDto {
    return { ...variant };
  }
}

export class ProductImageResponseDto implements ProductImageRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty() publicId!: string;
  @ApiProperty() secureUrl!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty() format!: string;
  @ApiProperty() bytes!: number;
  @ApiProperty() altText!: string;
  @ApiProperty() position!: number;
  @ApiProperty() isPrimary!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(image: ProductImageRecord): ProductImageResponseDto {
    return { ...image };
  }
}

export class ProductResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() description!: string;
  @ApiProperty() pricePiasters!: number;
  @ApiPropertyOptional({ nullable: true }) salePricePiasters!: number | null;
  @ApiProperty({ format: 'uuid' }) categoryId!: string;
  @ApiProperty({ format: 'uuid' }) brandId!: string;
  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] }) status!: ProductStatus;
  @ApiProperty() isFeatured!: boolean;
  @ApiProperty() isNewArrival!: boolean;
  @ApiProperty() category!: { id: string; name: string; slug: string };
  @ApiProperty() brand!: { id: string; name: string; slug: string };
  @ApiProperty({ type: [ProductVariantResponseDto] }) variants!: ProductVariantResponseDto[];
  @ApiProperty({ type: [ProductImageResponseDto] }) images!: ProductImageResponseDto[];
  @ApiProperty({ type: [String] }) availableSizes!: string[];
  @ApiProperty({ type: [String] }) availableColors!: string[];
  @ApiProperty() stockQuantity!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(product: ProductRecord): ProductResponseDto {
    const activeVariants = product.variants.filter((variant) => variant.isActive);
    return {
      ...product,
      variants: product.variants.map((variant) => ProductVariantResponseDto.from(variant)),
      images: product.images.map((image) => ProductImageResponseDto.from(image)),
      availableSizes: [...new Set(activeVariants.map((variant) => variant.size))],
      availableColors: [...new Set(activeVariants.map((variant) => variant.colorName))],
      stockQuantity: activeVariants.reduce((total, variant) => total + variant.stockQuantity, 0),
    };
  }
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] }) items!: ProductResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
