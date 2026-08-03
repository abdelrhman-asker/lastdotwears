export type OrderStatus =
  | 'PENDING'
  | 'WAITING_FOR_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'INSTAPAY';
export type PaymentStatus = 'PENDING' | 'WAITING_FOR_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface OrderItemRecord {
  id: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  productSlug: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string | null;
  imageUrl: string | null;
  unitPricePiasters: number;
  quantity: number;
  lineTotalPiasters: number;
}

export interface OrderPaymentRecord {
  id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountPiasters: number;
  instaPayReference: string | null;
  confirmationNote: string | null;
  confirmedAt: Date | null;
}

export interface OrderStatusEventRecord {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: Date;
}

export interface OrderHistoryPreviewItemRecord {
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  quantity: number;
}

export interface OrderSummaryRecord {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPiasters: number;
  placedAt: Date;
  itemCount: number;
  previewItems: OrderHistoryPreviewItemRecord[];
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  userId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  shippingGovernorateCode: string;
  shippingGovernorateName: string;
  shippingCity: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingPostalCode: string | null;
  deliveryNotes: string | null;
  couponCode: string | null;
  subtotalPiasters: number;
  discountPiasters: number;
  shippingPiasters: number;
  totalPiasters: number;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemRecord[];
  payment: OrderPaymentRecord;
  statusEvents: OrderStatusEventRecord[];
}
