import type { Order, OrderStatus, PaginatedOrders, PaymentStatus, ShippingRate } from './orders';

export type DashboardPeriod = 7 | 30 | 90 | 365;

export interface DashboardAnalytics {
  periodDays: DashboardPeriod;
  since: string;
  revenuePiasters: number;
  ordersInPeriod: number;
  customersTotal: number;
  newCustomersInPeriod: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
  bestSellers: Array<{
    productId: string | null;
    productName: string;
    productSlug: string;
    imageUrl: string | null;
    quantitySold: number;
    revenuePiasters: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    totalPiasters: number;
    placedAt: string;
  }>;
}

export type AdminOrders = Omit<PaginatedOrders, 'items'> & { items: Order[] };

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minimumSubtotalPiasters: number;
  maximumDiscountPiasters: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  timesUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCoupons {
  items: Coupon[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CouponWriteInput {
  code: string;
  description: string | null;
  discountType: Coupon['discountType'];
  value: number;
  minimumSubtotalPiasters: number;
  maximumDiscountPiasters: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  isActive: boolean;
}

export interface ShippingRateWriteInput {
  governorateCode: string;
  governorateName: string;
  feePiasters: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
}

export type { ShippingRate };
