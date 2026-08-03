import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import type { AddressRecord } from '../interfaces/address.interface.js';

const personNamePattern = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const governorateCodePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const postalCodePattern = /^[A-Za-z0-9 -]{2,20}$/u;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: 'Mariam' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  recipientFirstName!: string;

  @ApiProperty({ example: 'Hassan' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  @Matches(personNamePattern)
  recipientLastName!: string;

  @ApiProperty({ example: '01012345678' })
  @Transform(trim)
  @IsPhoneNumber('EG')
  phone!: string;

  @ApiProperty({ example: 'cairo' })
  @Transform(lower)
  @Matches(governorateCodePattern)
  governorateCode!: string;

  @ApiProperty({ example: 'Nasr City' })
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: '12 Example Street' })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  addressLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  addressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @Matches(postalCodePattern)
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  deliveryNotes?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class AddressResponseDto implements AddressRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() label!: string;
  @ApiProperty() recipientFirstName!: string;
  @ApiProperty() recipientLastName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() governorateCode!: string;
  @ApiProperty() governorateName!: string;
  @ApiProperty() city!: string;
  @ApiProperty() addressLine1!: string;
  @ApiPropertyOptional({ nullable: true }) addressLine2!: string | null;
  @ApiPropertyOptional({ nullable: true }) postalCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) deliveryNotes!: string | null;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;

  static from(record: AddressRecord): AddressResponseDto {
    return { ...record };
  }
}
