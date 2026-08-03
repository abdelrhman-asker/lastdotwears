import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { slugPattern } from '../../../common/utils/catalog-normalization.util.js';
import type { BrandRecord } from '../interfaces/brand.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const optionalBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateBrandDto {
  @ApiProperty({ example: 'Nile Studio' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'nile-studio', description: 'Generated from name when omitted.' })
  @Transform(trim)
  @IsOptional()
  @Matches(slugPattern)
  @MaxLength(140)
  slug?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  websiteUrl?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBrandDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @Transform(trim)
  @IsOptional()
  @Matches(slugPattern)
  @MaxLength(140)
  slug?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @Transform(trim)
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  websiteUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListBrandsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @Transform(optionalBoolean)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BrandResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) websiteUrl!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() productCount!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(brand: BrandRecord): BrandResponseDto {
    return { ...brand };
  }
}

export class PaginatedBrandsResponseDto {
  @ApiProperty({ type: [BrandResponseDto] }) items!: BrandResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
