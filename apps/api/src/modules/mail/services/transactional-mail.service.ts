import type { Readable } from 'node:stream';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

import type {
  AdminOrderMailDetails,
  ContactMailDetails,
  MailRecipient,
  MailService,
  OrderMailDetails,
  OrderReceiptAttachment,
} from '../interfaces/mail-service.interface.js';
import {
  buildNewOrderNotificationEmail,
  buildOrderCancelledEmail,
  buildOrderConfirmedEmail,
  buildOrderReceivedEmail,
  type OrderEmailTemplate,
} from '../templates/order-email.templates.js';
import { escapeHtml } from '../templates/mail-template.util.js';
import { mailErrorDetails } from '../utils/mail-error.util.js';

type MailChannel = 'orders' | 'support';
type SmtpTransport = Transporter<SMTPTransport.SentMessageInfo>;

@Injectable()
export class TransactionalMailService implements MailService {
  private readonly logger = new Logger(TransactionalMailService.name);
  private readonly transports: Record<MailChannel, SmtpTransport | null>;
  private readonly supportFrom: { name: string; address: string };
  private readonly logOnly: boolean;
  private readonly orderFrom = { name: 'Last Dot Orders', address: 'orders@last-dot.com' };
  private readonly orderReplyTo = 'orders@last-dot.com';

  constructor(private readonly configService: ConfigService) {
    this.logOnly = configService.getOrThrow<string>('MAIL_TRANSPORT') === 'log';
    this.supportFrom = {
      name: 'Last Dot Wears Support',
      address: configService.getOrThrow<string>('SUPPORT_MAIL_FROM_EMAIL'),
    };
    this.transports = { orders: null, support: null };
    if (this.logOnly) return;
    const secure = configService.getOrThrow<boolean>('SMTP_SECURE');
    const sharedOptions = {
      host: configService.getOrThrow<string>('SMTP_HOST'),
      port: configService.getOrThrow<number>('SMTP_PORT'),
      secure,
      requireTLS: !secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    };
    const ordersUser = configService.get<string>('SMTP_USER');
    const supportUser = configService.get<string>('SUPPORT_SMTP_USER');
    this.transports.orders = this.createTransport(
      'orders',
      sharedOptions,
      ordersUser,
      configService.get<string>('SMTP_PASSWORD'),
    );
    if (supportUser && supportUser.toLowerCase() === ordersUser?.toLowerCase()) {
      this.logger.error(
        'SMTP support transport unavailable: configure an independent mailbox login.',
      );
    } else {
      this.transports.support = this.createTransport(
        'support',
        sharedOptions,
        supportUser,
        configService.get<string>('SUPPORT_SMTP_PASSWORD'),
      );
    }
  }

  async sendEmailVerification(recipient: MailRecipient, verificationUrl: string): Promise<void> {
    await this.sendAccountAction('email verification', {
      recipient,
      subject: 'Verify your email address',
      actionLabel: 'Verify email',
      actionUrl: verificationUrl,
      introduction: 'Confirm your email address to finish setting up your account.',
    });
  }

  async sendPasswordReset(recipient: MailRecipient, resetUrl: string): Promise<void> {
    await this.sendAccountAction('password reset', {
      recipient,
      subject: 'Reset your password',
      actionLabel: 'Reset password',
      actionUrl: resetUrl,
      introduction:
        'A password reset was requested for your account. Ignore this email if it was not you.',
    });
  }

  async sendContactAcknowledgement(recipient: MailRecipient, subject: string): Promise<void> {
    await this.sendInformational('support', 'contact acknowledgment', {
      recipientEmail: recipient.email,
      subject: 'We received your message',
      text: `Hello ${recipient.firstName},\n\nWe received your message about “${subject}”. The Last Dot Wears support team will respond as soon as possible.`,
      html: `<h1 style="font-size:24px;font-weight:500">We received your message</h1><p>Hello ${escapeHtml(recipient.firstName)},</p><p>We received your message about <strong>${escapeHtml(subject)}</strong>. The Last Dot Wears support team will respond as soon as possible.</p>`,
    });
  }

  async sendContactNotification(message: ContactMailDetails): Promise<void> {
    const details: Array<[string, string]> = [
      ['Name', message.name],
      ['Email', message.email],
      ['Submitted (UTC)', message.submittedAt.toISOString()],
    ];
    if (message.phone) details.push(['Phone', message.phone]);
    await this.sendInformational('support', 'contact notification', {
      recipientEmail: this.configService.getOrThrow<string>('SUPPORT_NOTIFICATION_EMAIL'),
      replyTo: message.email,
      subject: 'Customer message: ' + message.subject.replace(/[\r\n]+/gu, ' '),
      text: [
        `Subject: ${message.subject}`,
        ...details.map(([label, value]) => `${label}: ${value}`),
        '',
        message.body,
      ].join('\n'),
      html: `<h1 style="font-size:24px;font-weight:500">${escapeHtml(message.subject)}</h1><p>${details.map(([label, value]) => `<strong>${label}:</strong> ${escapeHtml(value)}`).join('<br>')}</p><p style="white-space:pre-wrap">${escapeHtml(message.body)}</p>`,
    });
  }

  async sendOrderReceivedEmail(
    order: OrderMailDetails,
    receipt?: OrderReceiptAttachment,
  ): Promise<void> {
    const message = buildOrderReceivedEmail(order, Boolean(receipt));
    await this.sendInformational('orders', 'order received', {
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
                content: receipt.stream,
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
    await this.sendInformational('orders', 'order confirmed', {
      recipientEmail: order.customerEmail,
      replyTo: this.orderReplyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      completeHtml: true,
    });
  }

  async sendNewOrderNotification(
    order: AdminOrderMailDetails,
    receipt?: OrderReceiptAttachment,
    receiptSubmitted = false,
  ): Promise<void> {
    const message = buildNewOrderNotificationEmail(
      order,
      this.adminOrderUrl(order),
      receipt ? 'attached' : receiptSubmitted ? 'submitted' : 'none',
    );
    await this.sendAdminOrderMessage(order, message, receipt);
  }

  async sendOrderCancelledEmail(order: OrderMailDetails): Promise<void> {
    const message = buildOrderCancelledEmail(order);
    await this.sendInformational('orders', 'order cancelled', {
      ...message,
      recipientEmail: order.customerEmail,
      replyTo: this.orderReplyTo,
      completeHtml: true,
    });
  }

  async sendOrderCancellationNotification(
    order: AdminOrderMailDetails,
    refundReview: boolean,
  ): Promise<void> {
    const message = buildOrderCancelledEmail(order, {
      url: this.adminOrderUrl(order),
      refundReview,
    });
    await this.sendAdminOrderMessage(order, message);
  }

  private adminOrderUrl(order: AdminOrderMailDetails): string {
    return new URL(
      `/admin/orders/${encodeURIComponent(order.id)}`,
      this.configService.getOrThrow<string>('WEB_APP_URL'),
    ).href;
  }

  private async sendAdminOrderMessage(
    order: AdminOrderMailDetails,
    message: OrderEmailTemplate,
    receipt?: OrderReceiptAttachment,
  ): Promise<void> {
    await this.sendInformational('orders', 'admin order notification', {
      ...message,
      recipientEmail: this.configService.getOrThrow<string>('ORDER_NOTIFICATION_EMAIL'),
      replyTo: order.customerEmail,
      completeHtml: true,
      ...(receipt
        ? {
            attachments: [
              {
                filename: `receipt-${order.orderNumber}.${this.extensionFor(receipt.contentType)}`,
                content: receipt.stream,
                contentType: receipt.contentType,
              },
            ],
          }
        : {}),
    });
    if (!this.logOnly) this.logger.log(`SMTP accepted admin notification: ${message.subject}`);
  }

  private createTransport(
    channel: MailChannel,
    options: SMTPTransport.Options,
    user: string | undefined,
    pass: string | undefined,
  ): SmtpTransport | null {
    if (!user || !pass) {
      this.logger.error(
        `SMTP ${channel} transport unavailable: configure its mailbox credentials.`,
      );
      return null;
    }
    try {
      return nodemailer.createTransport({ ...options, auth: { user, pass } });
    } catch (error) {
      this.logger.error(
        `SMTP ${channel} transport initialization failed: ${mailErrorDetails(error)}`,
      );
      return null;
    }
  }

  private async sendAccountAction(
    kind: string,
    input: {
      recipient: MailRecipient;
      subject: string;
      actionLabel: string;
      actionUrl: string;
      introduction: string;
    },
  ): Promise<void> {
    const safeFirstName = escapeHtml(input.recipient.firstName);
    const safeUrl = escapeHtml(input.actionUrl);

    await this.deliver('support', kind, {
      from: this.supportFrom,
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

  private async sendInformational(
    channel: MailChannel,
    kind: string,
    input: {
      recipientEmail: string;
      subject: string;
      text: string;
      html: string;
      replyTo?: string;
      completeHtml?: boolean;
      attachments?: Array<{
        filename: string;
        content: Readable;
        contentType: string;
        cid?: string;
      }>;
    },
  ): Promise<void> {
    await this.deliver(channel, kind, {
      from: channel === 'orders' ? this.orderFrom : this.supportFrom,
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

  private async deliver(
    channel: MailChannel,
    kind: string,
    message: SendMailOptions,
  ): Promise<void> {
    if (this.logOnly) {
      this.logger.log(`Log-only ${channel} mail: ${kind}`);
      return;
    }
    try {
      const transporter = this.transports[channel];
      if (!transporter) throw new Error('SMTP transport is unavailable.');
      const result = await transporter.sendMail(message);
      if (result.accepted.length === 0) {
        throw Object.assign(new Error('SMTP did not accept the recipient.'), {
          code: 'ERECIPIENT',
        });
      }
      this.logger.log(`SMTP ${channel} accepted ${kind}`);
    } catch (error) {
      this.logger.error(`SMTP ${channel} failed to send ${kind}: ${mailErrorDetails(error)}`);
      throw error;
    }
  }

  private extensionFor(contentType: string): string {
    if (contentType === 'image/jpeg') return 'jpg';
    if (contentType === 'image/avif') return 'avif';
    if (contentType === 'image/webp') return 'webp';
    return 'png';
  }
}
