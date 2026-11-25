import type { Readable } from 'node:stream';
import type { OrderRecord } from '../../orders/interfaces/order.interface.js';

export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailRecipient {
  email: string;
  firstName: string;
}

export interface ContactMailDetails {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  body: string;
  submittedAt: Date;
}

export interface OrderMailItem {
  productName: string;
  sku: string;
  size: string;
  colorName: string;
  unitPricePiasters: number;
  quantity: number;
  lineTotalPiasters: number;
}

export interface OrderMailDetails {
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  orderNumber: string;
  status: string;
  subtotalPiasters: number;
  discountPiasters: number;
  shippingPiasters: number;
  totalPiasters: number;
  paymentMethod: string;
  shippingCity: string;
  shippingGovernorateName: string;
  items: OrderMailItem[];
}

export interface OrderReceiptAttachment {
  stream: Readable;
  contentType: string;
}

export type AdminOrderMailDetails = OrderMailDetails &
  Pick<
    OrderRecord,
    | 'id'
    | 'createdAt'
    | 'customerPhone'
    | 'shippingAddressLine1'
    | 'shippingAddressLine2'
    | 'shippingPostalCode'
    | 'deliveryNotes'
    | 'paymentStatus'
  >;

export interface MailService {
  sendEmailVerification(recipient: MailRecipient, verificationUrl: string): Promise<void>;
  sendPasswordReset(recipient: MailRecipient, resetUrl: string): Promise<void>;
  sendContactAcknowledgement(recipient: MailRecipient, subject: string): Promise<void>;
  sendContactNotification(message: ContactMailDetails): Promise<void>;
  sendOrderReceivedEmail(order: OrderMailDetails, receipt?: OrderReceiptAttachment): Promise<void>;
  sendOrderConfirmedEmail(order: OrderMailDetails): Promise<void>;
  sendNewOrderNotification(
    order: AdminOrderMailDetails,
    receipt?: OrderReceiptAttachment,
    receiptSubmitted?: boolean,
  ): Promise<void>;
  sendOrderCancelledEmail(order: OrderMailDetails): Promise<void>;
  sendOrderCancellationNotification(
    order: AdminOrderMailDetails,
    refundReview: boolean,
  ): Promise<void>;
}
