import type {
  OrderRecord,
  OrderStatus,
  OrderSummaryRecord,
  PaymentStatus,
} from './order.interface.js';

export const ORDERS_REPOSITORY = Symbol('ORDERS_REPOSITORY');

export interface OrdersRepository {
  findCustomerOrder(userId: string, orderNumber: string): Promise<OrderRecord | null>;
  listCustomer(input: {
    userId: string;
    page: number;
    limit: number;
    status?: OrderStatus;
  }): Promise<{ items: OrderSummaryRecord[]; total: number }>;
  findAdminOrder(id: string): Promise<OrderRecord | null>;
  listAdmin(input: {
    page: number;
    limit: number;
    search?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }): Promise<{ items: OrderRecord[]; total: number }>;
  transition(input: {
    orderId: string;
    actorId: string;
    expectedStatus: OrderStatus;
    status: OrderStatus;
    note: string | null;
    restockItems: boolean;
  }): Promise<'conflict' | 'not_found' | OrderRecord>;
  confirmInstaPay(input: {
    orderId: string;
    actorId: string;
    reference: string | null;
    note: string | null;
  }): Promise<'conflict' | 'not_found' | OrderRecord>;
}
