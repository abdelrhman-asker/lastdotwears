import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type {
  MailRecipient,
  MailService,
  OrderMailDetails,
} from '../interfaces/mail-service.interface.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

@Injectable()
export class TransactionalMailService implements MailService {
  private readonly logger = new Logger(TransactionalMailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: { name: string; address: string };
  private readonly logOnly: boolean;

  constructor(private readonly configService: ConfigService) {
    this.logOnly = configService.getOrThrow<string>('MAIL_TRANSPORT') === 'log';
    this.from = {
      name: configService.getOrThrow<string>('MAIL_FROM_NAME'),
      address: configService.getOrThrow<string>('MAIL_FROM_EMAIL'),
    };
    this.transporter = this.logOnly
      ? null
      : nodemailer.createTransport({
          host: configService.getOrThrow<string>('SMTP_HOST'),
          port: configService.getOrThrow<number>('SMTP_PORT'),
          secure: configService.getOrThrow<boolean>('SMTP_SECURE'),
          auth: this.smtpAuthentication(),
        });
  }

  async sendEmailVerification(recipient: MailRecipient, verificationUrl: string): Promise<void> {
    await this.send({
      recipient,
      subject: 'Verify your email address',
      actionLabel: 'Verify email',
      actionUrl: verificationUrl,
      introduction: 'Confirm your email address to finish setting up your account.',
    });
  }

  async sendPasswordReset(recipient: MailRecipient, resetUrl: string): Promise<void> {
    await this.send({
      recipient,
      subject: 'Reset your password',
      actionLabel: 'Reset password',
      actionUrl: resetUrl,
      introduction:
        'A password reset was requested for your account. Ignore this email if it was not you.',
    });
  }

  async sendContactAcknowledgement(recipient: MailRecipient, subject: string): Promise<void> {
    await this.sendInformational({
      recipientEmail: recipient.email,
      subject: 'We received your message',
      text: `Hello ${recipient.firstName},\n\nWe received your message about “${subject}”. Customer care will reply as soon as possible.`,
      html: `<p>Hello ${escapeHtml(recipient.firstName)},</p><p>We received your message about <strong>${escapeHtml(subject)}</strong>. Customer care will reply as soon as possible.</p>`,
    });
  }

  async sendContactNotification(
    recipientEmail: string,
    message: { name: string; email: string; phone: string | null; subject: string; body: string },
  ): Promise<void> {
    const contactLine = `${message.email}${message.phone ? ` · ${message.phone}` : ''}`;
    await this.sendInformational({
      recipientEmail,
      replyTo: message.email,
      subject: `Customer message: ${message.subject}`,
      text: `${message.name}\n${contactLine}\n\n${message.body}`,
      html: `<h1 style="font-size:24px;font-weight:500">${escapeHtml(message.subject)}</h1><p><strong>${escapeHtml(message.name)}</strong><br>${escapeHtml(contactLine)}</p><p style="white-space:pre-wrap">${escapeHtml(message.body)}</p>`,
    });
  }

  async sendOrderPlaced(recipient: MailRecipient, order: OrderMailDetails): Promise<void> {
    await this.sendOrderMessage(
      recipient,
      order,
      `Order ${order.orderNumber} received`,
      'Thank you for your order. We will keep you updated as it moves through fulfilment.',
    );
  }

  async sendOrderStatusUpdated(recipient: MailRecipient, order: OrderMailDetails): Promise<void> {
    await this.sendOrderMessage(
      recipient,
      order,
      `Order ${order.orderNumber}: ${order.status.replaceAll('_', ' ').toLowerCase()}`,
      `Your order status is now ${order.status.replaceAll('_', ' ').toLowerCase()}.`,
    );
  }

  private smtpAuthentication(): { user: string; pass: string } | undefined {
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    return user && pass ? { user, pass } : undefined;
  }

  private async send(input: {
    recipient: MailRecipient;
    subject: string;
    actionLabel: string;
    actionUrl: string;
    introduction: string;
  }): Promise<void> {
    if (this.logOnly) {
      this.logger.log(`${input.subject} for ${input.recipient.email}: ${input.actionUrl}`);
      return;
    }

    if (!this.transporter) {
      throw new Error('SMTP transport is not initialized.');
    }

    const safeFirstName = escapeHtml(input.recipient.firstName);
    const safeUrl = escapeHtml(input.actionUrl);

    await this.transporter.sendMail({
      from: this.from,
      to: input.recipient.email,
      subject: input.subject,
      text: `Hello ${input.recipient.firstName},\n\n${input.introduction}\n\n${input.actionUrl}\n\nThis link expires soon and can be used only once.`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;line-height:1.6;max-width:560px;margin:0 auto;padding:32px">
          <p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#78716c">Account notification</p>
          <h1 style="font-size:28px;font-weight:500">Hello ${safeFirstName}</h1>
          <p>${escapeHtml(input.introduction)}</p>
          <p style="margin:32px 0">
            <a href="${safeUrl}" style="background:#1c1917;color:#fff;padding:14px 22px;text-decoration:none;display:inline-block">${escapeHtml(input.actionLabel)}</a>
          </p>
          <p style="font-size:13px;color:#78716c">This link expires soon and can be used only once.</p>
        </div>
      `,
    });
  }

  private async sendInformational(input: {
    recipientEmail: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
  }): Promise<void> {
    if (this.logOnly) {
      this.logger.log(`${input.subject} for ${input.recipientEmail}`);
      return;
    }
    if (!this.transporter) throw new Error('SMTP transport is not initialized.');
    await this.transporter.sendMail({
      from: this.from,
      to: input.recipientEmail,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      subject: input.subject,
      text: input.text,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;line-height:1.6;max-width:560px;margin:0 auto;padding:32px">${input.html}<p style="margin-top:32px;font-size:12px;color:#78716c">Last-Dot Wears customer care</p></div>`,
    });
  }

  private sendOrderMessage(
    recipient: MailRecipient,
    order: OrderMailDetails,
    subject: string,
    introduction: string,
  ): Promise<void> {
    const total = new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(order.totalPiasters / 100);
    return this.sendInformational({
      recipientEmail: recipient.email,
      subject,
      text: `Hello ${recipient.firstName},\n\n${introduction}\n\nOrder: ${order.orderNumber}\nTotal: ${total}\nPayment: ${order.paymentMethod.replaceAll('_', ' ')}`,
      html: `<p>Hello ${escapeHtml(recipient.firstName)},</p><p>${escapeHtml(introduction)}</p><p><strong>Order</strong><br>${escapeHtml(order.orderNumber)}</p><p><strong>Total</strong><br>${escapeHtml(total)}</p><p><strong>Payment</strong><br>${escapeHtml(order.paymentMethod.replaceAll('_', ' '))}</p>`,
    });
  }
}
