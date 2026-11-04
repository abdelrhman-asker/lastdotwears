import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { InstaPayInstructionsDto } from '../../payments/dto/instapay.dto.js';
import type {
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  OrderStatusEventRecord,
  OrderSummaryRecord,
  PaymentStatus,
} from '../interfaces/order.interface.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const orderStatuses: OrderStatus[] = [
  'PENDING',
  'WAITING_FOR_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];
export const paymentStatuses: PaymentStatus[] = [
  'PENDING',
  'WAITING_FOR_PAYMENT',
  'PAID',
  'CANCELLED',
  'REFUNDED',
];

export class OrderItemResponseDto implements OrderItemRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) productId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) variantId!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty() productSlug!: string;
  @ApiProperty() sku!: string;
  @ApiProperty() size!: string;
  @ApiProperty() colorName!: string;
  @ApiPropertyOptional({ nullable: true }) colorHex!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() unitPricePiasters!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() lineTotalPiasters!: number;
}

export class OrderPaymentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: ['CASH_ON_DELIVERY', 'INSTAPAY'] }) method!: 'CASH_ON_DELIVERY' | 'INSTAPAY';
  @ApiProperty({ enum: paymentStatuses }) status!: PaymentStatus;
  @ApiProperty() amountPiasters!: number;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) proofSubmittedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) instaPayReference!: string | null;
  @ApiPropertyOptional({ nullable: true }) confirmationNote!: string | null;
  @ApiPropertyOptional({ nullable: true, format: 'date-time' }) confirmedAt!: Date | null;
}

export class OrderStatusEventResponseDto implements OrderStatusEventRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiPropertyOptional({ enum: orderStatuses, nullable: true }) fromStatus!: OrderStatus | null;
  @ApiProperty({ enum: orderStatuses }) toStatus!: OrderStatus;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
}

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() invoiceNumber!: string;
  @ApiProperty({ enum: orderStatuses }) status!: OrderStatus;
  @ApiProperty({ enum: ['CASH_ON_DELIVERY', 'INSTAPAY'] })
  paymentMethod!: 'CASH_ON_DELIVERY' | 'INSTAPAY';
  @ApiProperty({ enum: paymentStatuses }) paymentStatus!: PaymentStatus;
  @ApiProperty() customerFirstName!: string;
  @ApiProperty() customerLastName!: string;
  @ApiProperty() customerEmail!: string;
  @ApiProperty() customerPhone!: string;
  @ApiProperty() shippingGovernorateCode!: string;
  @ApiProperty() shippingGovernorateName!: string;
  @ApiProperty() shippingCity!: string;
  @ApiProperty() shippingAddressLine1!: string;
  @ApiPropertyOptional({ nullable: true }) shippingAddressLine2!: string | null;
  @ApiPropertyOptional({ nullable: true }) shippingPostalCode!: string | null;
  @ApiPropertyOptional({ nullable: true }) deliveryNotes!: string | null;
  @ApiPropertyOptional({ nullable: true }) couponCode!: string | null;
  @ApiProperty() subtotalPiasters!: number;
  @ApiProperty() discountPiasters!: number;
  @ApiProperty() shippingPiasters!: number;
  @ApiProperty() totalPiasters!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt!: Date;
  @ApiProperty({ type: [OrderItemResponseDto] }) items!: OrderItemResponseDto[];
  @ApiProperty({ type: OrderPaymentResponseDto }) payment!: OrderPaymentResponseDto;
  @ApiProperty({ type: [OrderStatusEventResponseDto] })
  statusEvents!: OrderStatusEventResponseDto[];
  @ApiPropertyOptional({ type: InstaPayInstructionsDto, nullable: true })
  instaPayInstructions!: InstaPayInstructionsDto | null;

  static from(record: OrderRecord, instructions: InstaPayInstructionsDto | null): OrderResponseDto {
    const payment: OrderPaymentResponseDto = {
      id: record.payment.id,
      method: record.payment.method,
      status: record.payment.status,
      amountPiasters: record.payment.amountPiasters,
      proofSubmittedAt: record.payment.proofSubmittedAt,
      instaPayReference: record.payment.instaPayReference,
      confirmationNote: record.payment.confirmationNote,
      confirmedAt: record.payment.confirmedAt,
    };
    return { ...record, payment, instaPayInstructions: instructions };
  }
}

export class ListAdminOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(orderStatuses)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(paymentStatuses)
  paymentStatus?: PaymentStatus;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] }) items!: OrderResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class OrderHistoryPreviewItemResponseDto {
  @ApiProperty() productName!: string;
  @ApiProperty() productSlug!: string;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() quantity!: number;
}

export class OrderSummaryResponseDto implements OrderSummaryRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty({ enum: orderStatuses }) status!: OrderStatus;
  @ApiProperty({ enum: ['CASH_ON_DELIVERY', 'INSTAPAY'] })
  paymentMethod!: 'CASH_ON_DELIVERY' | 'INSTAPAY';
  @ApiProperty({ enum: paymentStatuses }) paymentStatus!: PaymentStatus;
  @ApiProperty() totalPiasters!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: Date;
  @ApiProperty() itemCount!: number;
  @ApiProperty({ type: [OrderHistoryPreviewItemResponseDto] })
  previewItems!: OrderHistoryPreviewItemResponseDto[];

  static from(record: OrderSummaryRecord): OrderSummaryResponseDto {
    return { ...record };
  }
}

export class ListCustomerOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;

  @IsOptional()
  @IsIn(orderStatuses)
  status?: OrderStatus;
}

export class PaginatedCustomerOrdersResponseDto {
  @ApiProperty({ type: [OrderSummaryResponseDto] }) items!: OrderSummaryResponseDto[];
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: orderStatuses })
  @IsIn(orderStatuses)
  status!: OrderStatus;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Only applies to REFUNDED orders.' })
  @IsOptional()
  @IsBoolean()
  restockItems?: boolean;
}

export class ConfirmInstaPayDto {
  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
