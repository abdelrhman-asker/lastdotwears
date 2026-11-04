export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailRecipient {
  email: string;
  firstName: string;
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
  path: string;
  contentType: string;
}

export interface MailService {
  sendEmailVerification(recipient: MailRecipient, verificationUrl: string): Promise<void>;
  sendPasswordReset(recipient: MailRecipient, resetUrl: string): Promise<void>;
  sendContactAcknowledgement(recipient: MailRecipient, subject: string): Promise<void>;
  sendContactNotification(
    recipientEmail: string,
    message: { name: string; email: string; phone: string | null; subject: string; body: string },
  ): Promise<void>;
  sendOrderReceivedEmail(order: OrderMailDetails, receipt?: OrderReceiptAttachment): Promise<void>;
  sendOrderConfirmedEmail(order: OrderMailDetails): Promise<void>;
  sendNewOrderNotification(order: OrderMailDetails): Promise<void>;
}
