import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const personNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const egyptianMobilePattern = /^(?:\+20|0)?1[0125]\d{8}$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class RegisterDto {
  @ApiProperty({ example: 'customer@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(strongPasswordPattern, {
    message: 'password must include uppercase, lowercase, number, and symbol characters',
  })
  password!: string;

  @ApiProperty({ example: 'Mariam' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  firstName!: string;

  @ApiProperty({ example: 'Hassan' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  lastName!: string;

  @ApiPropertyOptional({ example: '+201012345678' })
  @Transform(trimString)
  @IsOptional()
  @Matches(egyptianMobilePattern, { message: 'phone must be a valid Egyptian mobile number' })
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'customer@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MaxLength(128)
  password!: string;
}

export class EmailRequestDto {
  @ApiProperty({ example: 'customer@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class TokenRequestDto {
  @ApiProperty({ description: 'The opaque one-time token from the email link.' })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  token!: string;
}

export class ResetPasswordDto extends TokenRequestDto {
  @ApiProperty({ minLength: 12, maxLength: 128, writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(strongPasswordPattern, {
    message: 'password must include uppercase, lowercase, number, and symbol characters',
  })
  password!: string;
}
