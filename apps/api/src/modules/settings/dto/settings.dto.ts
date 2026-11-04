import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsISO8601,
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
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import type {
  HomepageBannerRecord,
  SocialLinkRecord,
  WebsiteSettingsRecord,
} from '../interfaces/settings.interface.js';

const phonePattern = /^\+?[0-9 ()-]{7,20}$/;
const internalOrHttpsUrl = /^(?:\/(?!\/)|https:\/\/)/i;
const rootRelativeOrHttpsImageUrl = /^(?:\/(?!\/)|https:\/\/)/i;

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function lower({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class UpdateWebsiteSettingsDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  storeName?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  tagline?: string;

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @Matches(phonePattern)
  contactPhone?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  storeAddress?: string | null;

  @ApiPropertyOptional({ maxLength: 250 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(250)
  businessHours?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 180 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(180)
  announcementText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  announcementEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cashOnDeliveryEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  instaPayEnabled?: boolean;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  instaPayId?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  instaPayQrValue?: string | null;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  instaPayInstructions?: string;
}

export class WebsiteSettingsResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty() tagline!: string;
  @ApiProperty() contactEmail!: string;
  @ApiProperty({ nullable: true }) contactPhone!: string | null;
  @ApiProperty({ nullable: true }) storeAddress!: string | null;
  @ApiProperty() businessHours!: string;
  @ApiProperty({ nullable: true }) announcementText!: string | null;
  @ApiProperty() announcementEnabled!: boolean;
  @ApiProperty() cashOnDeliveryEnabled!: boolean;
  @ApiProperty() instaPayEnabled!: boolean;
  @ApiProperty() instaPayId!: string;
  @ApiProperty({ nullable: true }) instaPayQrValue!: string | null;
  @ApiProperty() instaPayInstructions!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(settings: WebsiteSettingsRecord): WebsiteSettingsResponseDto {
    return { ...settings };
  }
}

export class CreateSocialLinkDto {
  @ApiProperty({ example: 'instagram' })
  @Transform(lower)
  @Matches(/^[a-z0-9-]{2,40}$/)
  platform!: string;

  @ApiProperty({ maxLength: 80 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label!: string;

  @ApiProperty({ format: 'uri' })
  @Transform(trim)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSocialLinkDto extends PartialType(CreateSocialLinkDto) {}

export class SocialLinkResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() platform!: string;
  @ApiProperty() label!: string;
  @ApiProperty() url!: string;
  @ApiProperty() position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(link: SocialLinkRecord): SocialLinkResponseDto {
    return { ...link };
  }
}

export class CreateHomepageBannerDto {
  @ApiPropertyOptional({ nullable: true, maxLength: 100 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  eyebrow?: string | null;

  @ApiProperty({ maxLength: 180 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty({ description: 'HTTPS image URL or a root-relative server asset.' })
  @Transform(trim)
  @Matches(rootRelativeOrHttpsImageUrl)
  @MaxLength(2048)
  imageUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  imagePublicId?: string | null;

  @ApiProperty({ maxLength: 180 })
  @Transform(trim)
  @IsString()
  @MinLength(4)
  @MaxLength(180)
  altText!: string;

  @ApiProperty({ maxLength: 80 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ctaLabel!: string;

  @ApiProperty()
  @Transform(trim)
  @Matches(internalOrHttpsUrl)
  @MaxLength(2048)
  ctaUrl!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time' })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;
}

export class UpdateHomepageBannerDto extends PartialType(CreateHomepageBannerDto) {}

export class HomepageBannerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) eyebrow!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() imageUrl!: string;
  @ApiProperty({ nullable: true }) imagePublicId!: string | null;
  @ApiProperty() altText!: string;
  @ApiProperty() ctaLabel!: string;
  @ApiProperty() ctaUrl!: string;
  @ApiProperty() position!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true }) startsAt!: Date | null;
  @ApiProperty({ nullable: true }) endsAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(banner: HomepageBannerRecord): HomepageBannerResponseDto {
    return { ...banner };
  }
}

export class PublicWebsiteSettingsResponseDto {
  @ApiProperty() storeName!: string;
  @ApiProperty() tagline!: string;
  @ApiProperty() contactEmail!: string;
  @ApiProperty({ nullable: true }) contactPhone!: string | null;
  @ApiProperty({ nullable: true }) storeAddress!: string | null;
  @ApiProperty() businessHours!: string;
  @ApiProperty({ nullable: true }) announcementText!: string | null;
  @ApiProperty() announcementEnabled!: boolean;
  @ApiProperty() cashOnDeliveryEnabled!: boolean;
  @ApiProperty() instaPayEnabled!: boolean;
  @ApiProperty({ type: [SocialLinkResponseDto] }) socialLinks!: SocialLinkResponseDto[];
  @ApiProperty({ type: [HomepageBannerResponseDto] }) banners!: HomepageBannerResponseDto[];
}

export class BannerImageUploadResponseDto {
  @ApiProperty() publicId!: string;
  @ApiProperty({ format: 'uri' }) secureUrl!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty() format!: string;
  @ApiProperty() bytes!: number;
}
