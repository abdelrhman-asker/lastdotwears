import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const lower = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const couponCode = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CheckoutQuoteDto {
  @ApiProperty({ example: 'cairo' })
  @Transform(lower)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  governorateCode!: string;

  @ApiPropertyOptional({ example: 'WELCOME10', nullable: true })
  @Transform(couponCode)
  @IsOptional()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/u)
  couponCode?: string | null;
}

export class PlaceOrderDto extends CheckoutQuoteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  idempotencyKey!: string;

  @ApiProperty({ enum: ['CASH_ON_DELIVERY', 'INSTAPAY'] })
  @IsIn(['CASH_ON_DELIVERY', 'INSTAPAY'])
  paymentMethod!: 'CASH_ON_DELIVERY' | 'INSTAPAY';

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  customerFirstName!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  customerLastName!: string;

  @ApiProperty()
  @Transform(lower)
  @IsEmail()
  @MaxLength(254)
  customerEmail!: string;

  @ApiProperty({ example: '01012345678' })
  @Transform(trim)
  @IsPhoneNumber('EG')
  customerPhone!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  shippingCity!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  shippingAddressLine1!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  shippingAddressLine2?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @Matches(/^[A-Za-z0-9 -]{2,20}$/u)
  shippingPostalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  deliveryNotes?: string | null;
}

export class CheckoutShippingResponseDto {
  @ApiProperty() governorateCode!: string;
  @ApiProperty() governorateName!: string;
  @ApiProperty() estimatedMinDays!: number;
  @ApiProperty() estimatedMaxDays!: number;
}

export class CheckoutQuoteResponseDto {
  @ApiProperty() subtotalPiasters!: number;
  @ApiProperty() discountPiasters!: number;
  @ApiProperty() shippingPiasters!: number;
  @ApiProperty() totalPiasters!: number;
  @ApiPropertyOptional({ nullable: true }) couponCode!: string | null;
  @ApiProperty({ type: CheckoutShippingResponseDto }) shipping!: CheckoutShippingResponseDto;
}
