import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type {
  MailRecipient,
  MailService,
  OrderMailDetails,
  OrderReceiptAttachment,
} from '../interfaces/mail-service.interface.js';
import {
  buildNewOrderNotificationEmail,
  buildOrderConfirmedEmail,
  buildOrderReceivedEmail,
} from '../templates/order-email.templates.js';

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
  private readonly from: string | { name: string; address: string };
  private readonly logOnly: boolean;
  private readonly orderFrom = { name: 'Last Dot Orders', address: 'orders@last-dot.com' };
  private readonly orderReplyTo = 'orders@last-dot.com';

  constructor(private readonly configService: ConfigService) {
    this.logOnly = configService.getOrThrow<string>('MAIL_TRANSPORT') === 'log';
    this.from = configService.get<string>('EMAIL_FROM') ?? {
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
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
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

  async sendOrderReceivedEmail(
    order: OrderMailDetails,
    receipt?: OrderReceiptAttachment,
  ): Promise<void> {
    const message = buildOrderReceivedEmail(order, Boolean(receipt));
    await this.sendInformational({
      from: this.orderFrom,
      recipientEmail: order.customerEmail,
      replyTo: this.orderReplyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      completeHtml: true,
      ...(receipt
        ? {
            attachments: [
              {
                filename: `receipt-${order.orderNumber}.${this.extensionFor(receipt.contentType)}`,
                path: receipt.path,
                contentType: receipt.contentType,
                cid: 'payment-receipt@last-dot',
              },
            ],
          }
        : {}),
    });
  }

  async sendOrderConfirmedEmail(order: OrderMailDetails): Promise<void> {
    const message = buildOrderConfirmedEmail(order);
    await this.sendInformational({
      from: this.orderFrom,
      recipientEmail: order.customerEmail,
      replyTo: this.orderReplyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      completeHtml: true,
    });
  }

  async sendNewOrderNotification(order: OrderMailDetails): Promise<void> {
    const message = buildNewOrderNotificationEmail(order);
    await this.sendInformational({
      from: this.orderFrom,
      recipientEmail: this.configService.getOrThrow<string>('ORDER_NOTIFICATION_EMAIL'),
      replyTo: order.customerEmail,
      subject: message.subject,
      text: message.text,
      html: message.html,
      completeHtml: true,
    });
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
    from?: string | { name: string; address: string };
    recipientEmail: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    completeHtml?: boolean;
    attachments?: Array<{
      filename: string;
      path: string;
      contentType: string;
      cid: string;
    }>;
  }): Promise<void> {
    if (this.logOnly) {
      this.logger.log(`${input.subject} for ${input.recipientEmail}`);
      return;
    }
    if (!this.transporter) throw new Error('SMTP transport is not initialized.');
    await this.transporter.sendMail({
      from: input.from ?? this.from,
      to: input.recipientEmail,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      subject: input.subject,
      text: input.text,
      html: input.completeHtml
        ? input.html
        : `<div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;line-height:1.6;max-width:560px;margin:0 auto;padding:32px">${input.html}<p style="margin-top:32px;font-size:12px;color:#78716c">Last-Dot Wears customer care</p></div>`,
      ...(input.attachments ? { attachments: input.attachments } : {}),
    });
  }

  private extensionFor(contentType: string): string {
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/avif') return 'avif';
    if (contentType === 'image/webp') return 'webp';
    return 'png';
  }
}
