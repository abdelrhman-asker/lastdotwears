import type { OrderStatus, PaymentStatus } from '../../orders/interfaces/order.interface.js';

export interface DashboardBestSellerRecord {
  productId: string | null;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantitySold: number;
  revenuePiasters: number;
}

export interface DashboardRecentOrderRecord {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalPiasters: number;
  placedAt: Date;
}

export interface DashboardRecord {
  revenuePiasters: number;
  ordersInPeriod: number;
  customersTotal: number;
  newCustomersInPeriod: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
  bestSellers: DashboardBestSellerRecord[];
  recentOrders: DashboardRecentOrderRecord[];
}
