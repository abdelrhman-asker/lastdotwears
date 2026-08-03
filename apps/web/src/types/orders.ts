export type PaymentMethod = 'CASH_ON_DELIVERY' | 'INSTAPAY';
export type PaymentStatus = 'PENDING' | 'WAITING_FOR_PAYMENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type OrderStatus =
  | 'PENDING'
  | 'WAITING_FOR_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface ShippingRate {
  id: string;
  governorateCode: string;
  governorateName: string;
  feePiasters: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutQuote {
  subtotalPiasters: number;
  discountPiasters: number;
  shippingPiasters: number;
  totalPiasters: number;
  couponCode: string | null;
  shipping: {
    governorateCode: string;
    governorateName: string;
    estimatedMinDays: number;
    estimatedMaxDays: number;
  };
}

export interface OrderItem {
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

export interface Order {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
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
  placedAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payment: {
    id: string;
    method: PaymentMethod;
    status: PaymentStatus;
    amountPiasters: number;
    instaPayReference: string | null;
    confirmationNote: string | null;
    confirmedAt: string | null;
  };
  statusEvents: Array<{
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    createdAt: string;
  }>;
  instaPayInstructions: {
    instaPayId: string;
    qrCodeDataUrl: string;
    instructions: string;
    amountPiasters: number;
    orderNumber: string;
  } | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPiasters: number;
  placedAt: string;
  itemCount: number;
  previewItems: Array<{
    productName: string;
    productSlug: string;
    imageUrl: string | null;
    quantity: number;
  }>;
}

export interface PaginatedOrders {
  items: OrderSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
