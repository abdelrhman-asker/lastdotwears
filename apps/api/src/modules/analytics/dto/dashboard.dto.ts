import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { orderStatuses } from '../../orders/dto/order.dto.js';
import type { OrderStatus, PaymentStatus } from '../../orders/interfaces/order.interface.js';
import type {
  DashboardBestSellerRecord,
  DashboardRecentOrderRecord,
  DashboardRecord,
} from '../interfaces/dashboard.interface.js';

export const dashboardPeriods = [7, 30, 90, 365] as const;
export type DashboardPeriod = (typeof dashboardPeriods)[number];

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: dashboardPeriods, default: 30 })
  @Type(() => Number)
  @IsIn(dashboardPeriods)
  days: DashboardPeriod = 30;
}

export class DashboardBestSellerDto implements DashboardBestSellerRecord {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) productId!: string | null;
  @ApiProperty() productName!: string;
  @ApiProperty() productSlug!: string;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() quantitySold!: number;
  @ApiProperty() revenuePiasters!: number;
}

export class DashboardRecentOrderDto implements DashboardRecentOrderRecord {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() customerName!: string;
  @ApiProperty({ enum: orderStatuses }) status!: OrderStatus;
  @ApiProperty({ enum: ['PENDING', 'WAITING_FOR_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED'] })
  paymentStatus!: PaymentStatus;
  @ApiProperty() totalPiasters!: number;
  @ApiProperty({ format: 'date-time' }) placedAt!: Date;
}

export class DashboardResponseDto implements DashboardRecord {
  @ApiProperty() periodDays!: number;
  @ApiProperty({ format: 'date-time' }) since!: Date;
  @ApiProperty() revenuePiasters!: number;
  @ApiProperty() ordersInPeriod!: number;
  @ApiProperty() customersTotal!: number;
  @ApiProperty() newCustomersInPeriod!: number;
  @ApiProperty({ additionalProperties: { type: 'number' } })
  statusCounts!: Partial<Record<OrderStatus, number>>;
  @ApiProperty({ type: [DashboardBestSellerDto] }) bestSellers!: DashboardBestSellerDto[];
  @ApiProperty({ type: [DashboardRecentOrderDto] }) recentOrders!: DashboardRecentOrderDto[];

  static from(record: DashboardRecord, periodDays: number, since: Date): DashboardResponseDto {
    return { ...record, periodDays, since };
  }
}
