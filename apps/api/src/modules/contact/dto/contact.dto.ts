import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ContactMessageRecord, ContactStatus } from '../interfaces/contact.interface.js';

const statuses: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function lower({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class CreateContactMessageDto {
  @ApiProperty({ maxLength: 160 })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ format: 'email' })
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @Matches(phonePattern)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[A-Za-z0-9-]{4,32}$/)
  orderNumber?: string | null;

  @ApiProperty({ maxLength: 160 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @ApiProperty({ maxLength: 3000 })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(3000)
  message!: string;
}

export class AdminContactListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: ContactStatus;
}

export class UpdateContactMessageDto {
  @ApiPropertyOptional({ enum: statuses })
  @IsOptional()
  @IsIn(statuses)
  status?: ContactStatus;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  adminNote?: string | null;
}

export class ContactMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: statuses }) status!: ContactStatus;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true }) phone!: string | null;
  @ApiProperty({ nullable: true }) orderNumber!: string | null;
  @ApiProperty() subject!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ nullable: true }) adminNote!: string | null;
  @ApiProperty({ nullable: true }) resolvedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static from(message: ContactMessageRecord): ContactMessageResponseDto {
    return { ...message };
  }
}

export class PaginatedContactMessagesResponseDto {
  @ApiProperty({ type: [ContactMessageResponseDto] }) items!: ContactMessageResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class ContactSubmissionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() message!: string;
}
