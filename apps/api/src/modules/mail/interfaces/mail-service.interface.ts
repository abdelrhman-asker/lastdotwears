export const MAIL_SERVICE = Symbol('MAIL_SERVICE');

export interface MailRecipient {
  email: string;
  firstName: string;
}

export interface OrderMailDetails {
  orderNumber: string;
  status: string;
  totalPiasters: number;
  paymentMethod: string;
}

export interface MailService {
  sendEmailVerification(recipient: MailRecipient, verificationUrl: string): Promise<void>;
  sendPasswordReset(recipient: MailRecipient, resetUrl: string): Promise<void>;
  sendContactAcknowledgement(recipient: MailRecipient, subject: string): Promise<void>;
  sendContactNotification(
    recipientEmail: string,
    message: { name: string; email: string; phone: string | null; subject: string; body: string },
  ): Promise<void>;
  sendOrderPlaced(recipient: MailRecipient, order: OrderMailDetails): Promise<void>;
  sendOrderStatusUpdated(recipient: MailRecipient, order: OrderMailDetails): Promise<void>;
}
