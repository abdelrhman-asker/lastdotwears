import { Transform, Type } from 'class-transformer';
import {
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

import type { PublicUser, UserRole, UserStatus } from '../interfaces/user-record.interface.js';

const personNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: ['CUSTOMER', 'ADMIN'] })
  role!: UserRole;

  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED'] })
  status!: UserStatus;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  emailVerifiedAt!: Date | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  static from(user: PublicUser): UserResponseDto {
    return { ...user };
  }
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Mariam' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Hassan' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  lastName?: string;

  @ApiPropertyOptional({ example: '+201012345678', nullable: true })
  @Transform(trimString)
  @IsOptional()
  @Matches(egyptianMobilePattern, { message: 'phone must be a valid Egyptian mobile number' })
  phone?: string | null;
}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional()
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'BLOCKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'BLOCKED'])
  status?: UserStatus;
}

export class SetCustomerStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'BLOCKED'] })
  @IsIn(['ACTIVE', 'BLOCKED'])
  status!: UserStatus;

  @ApiPropertyOptional({ maxLength: 500 })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
