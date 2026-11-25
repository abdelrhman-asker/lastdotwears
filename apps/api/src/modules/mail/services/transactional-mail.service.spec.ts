import { Readable } from 'node:stream';

import { ConfigService } from '@nestjs/config';
import nodemailer, { type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

import type { AdminOrderMailDetails } from '../interfaces/mail-service.interface.js';
import { TransactionalMailService } from './transactional-mail.service.js';

const order: AdminOrderMailDetails = {
  id: 'fixture-order',
  orderNumber: 'LDW-FIXTURE',
  createdAt: new Date('2026-11-25T12:00:00Z'),
  customerEmail: 'buyer@example.test',
  customerFirstName: 'Test',
  customerLastName: 'Buyer',
  customerPhone: '01012345678',
  shippingCity: 'Cairo',
  shippingGovernorateName: 'Cairo',
  shippingAddressLine1: '12 Example Street',
  shippingAddressLine2: null,
  shippingPostalCode: null,
  deliveryNotes: null,
  subtotalPiasters: 10_000,
  discountPiasters: 0,
  shippingPiasters: 1_000,
  totalPiasters: 11_000,
  status: 'WAITING_FOR_PAYMENT',
  paymentMethod: 'INSTAPAY',
  paymentStatus: 'WAITING_FOR_PAYMENT',
  items: [],
};

const createTransport = nodemailer.createTransport;
afterEach(() => {
  nodemailer.createTransport = createTransport;
});

const ordersAddress = 'orders@last-dot.com';
const supportAddress = 'support@last-dot.com';
const recipient = { email: order.customerEmail, firstName: 'Buyer' };

function useFakeSmtp({
  rejectRecipients = false,
  failAuthFor,
  config = {},
}: {
  rejectRecipients?: boolean;
  failAuthFor?: string;
  config?: Record<string, string | boolean | undefined>;
} = {}) {
  const orders: SendMailOptions[] = [];
  const support: SendMailOptions[] = [];
  const transports: SMTPTransport.Options[] = [];
  nodemailer.createTransport = ((options: SMTPTransport.Options) => {
    transports.push(options);
    const user = options.auth?.user;
    const sendMail = (message: SendMailOptions) => {
      (user === ordersAddress ? orders : support).push(message);
      if (user === failAuthFor) {
        return Promise.reject(
          Object.assign(new Error('Sensitive provider response'), {
            code: 'EAUTH',
            command: 'AUTH LOGIN',
            responseCode: 535,
          }),
        );
      }
      return Promise.resolve({ accepted: rejectRecipients ? [] : ['accepted@example.test'] });
    };
    return { sendMail };
  }) as typeof createTransport;
  const service = new TransactionalMailService(
    new ConfigService({
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      SMTP_USER: ordersAddress,
      SMTP_PASSWORD: 'fixture-orders-password',
      SUPPORT_SMTP_USER: supportAddress,
      SUPPORT_SMTP_PASSWORD: 'fixture-support-password',
      SUPPORT_MAIL_FROM_EMAIL: supportAddress,
      SUPPORT_NOTIFICATION_EMAIL: supportAddress,
      MAIL_FROM_NAME: 'Last Dot',
      MAIL_FROM_EMAIL: 'orders@last-dot.com',
      ORDER_NOTIFICATION_EMAIL: 'orders@last-dot.com',
      WEB_APP_URL: 'https://www.last-dot.com',
      ...config,
    }),
  );
  return { service, orders, support, transports };
}

describe('TransactionalMailService order notifications', () => {
  it('sends the merchant a dashboard link and streamed proof without a receipt URL', async () => {
    const { service, orders, support } = useFakeSmtp();
    const stream = Readable.from([Buffer.from('receipt fixture')]);
    await service.sendNewOrderNotification(order, { stream, contentType: 'image/png' }, true);
    const message = orders[0];
    expect(message).toMatchObject({
      to: 'orders@last-dot.com',
      subject: 'InstaPay receipt for order #LDW-FIXTURE',
      attachments: [
        { filename: 'receipt-LDW-FIXTURE.png', content: stream, contentType: 'image/png' },
      ],
    });
    expect(message?.text).toContain('https://www.last-dot.com/admin/orders/fixture-order');
    expect(message?.html).not.toContain('cloudinary');
    expect(message?.attachments?.[0]).not.toHaveProperty('href');
    expect(support).toHaveLength(0);
    stream.destroy();
  });

  it('surfaces a delivery failure when SMTP accepts no recipients', async () => {
    const { service } = useFakeSmtp({ rejectRecipients: true });
    await expect(service.sendNewOrderNotification(order)).rejects.toMatchObject({
      code: 'ERECIPIENT',
    });
  });

  it('uses independent mailbox credentials with the same TLS endpoint', () => {
    const { transports } = useFakeSmtp({ config: { SMTP_SECURE: false } });
    expect(transports).toMatchObject([
      {
        host: 'smtp.example.test',
        secure: false,
        requireTLS: true,
        auth: { user: ordersAddress, pass: 'fixture-orders-password' },
      },
      {
        host: 'smtp.example.test',
        secure: false,
        requireTLS: true,
        auth: { user: supportAddress, pass: 'fixture-support-password' },
      },
    ]);
  });

  it('sends all existing order status messages through orders', async () => {
    const { service, orders, support } = useFakeSmtp();
    await service.sendOrderReceivedEmail(order);
    await service.sendOrderConfirmedEmail(order);
    await service.sendOrderCancelledEmail(order);
    await service.sendOrderCancellationNotification(order, true);
    expect(orders.map(({ to }) => to)).toEqual([
      recipient.email,
      recipient.email,
      recipient.email,
      ordersAddress,
    ]);
    expect(
      orders.every(({ from }) => typeof from === 'object' && from.address === ordersAddress),
    ).toBe(true);
    expect(support).toHaveLength(0);
  });

  it('sends an escaped, dated contact notification and a separate customer acknowledgment via support', async () => {
    const inbox = 'care-inbox@example.test';
    const { service, orders, support } = useFakeSmtp({
      config: { SUPPORT_NOTIFICATION_EMAIL: inbox },
    });
    await service.sendContactNotification({
      name: 'Buyer <Customer>',
      email: recipient.email,
      phone: '+20 1000000000',
      subject: 'Order <help>',
      body: 'Please help <script>',
      submittedAt: order.createdAt,
    });
    await service.sendContactAcknowledgement(recipient, 'Order <help>');
    const [notification, acknowledgement] = support;
    expect(notification).toMatchObject({
      from: { address: supportAddress },
      to: inbox,
      replyTo: recipient.email,
      subject: 'Customer message: Order <help>',
    });
    expect(notification?.text).toContain('2026-11-25T12:00:00.000Z');
    expect(notification?.text).toContain('+20 1000000000');
    expect(notification?.html).toContain('Buyer &lt;Customer&gt;');
    expect(notification?.html).toContain('Please help &lt;script&gt;');
    expect(acknowledgement).toMatchObject({
      from: { address: supportAddress },
      to: recipient.email,
    });
    expect(acknowledgement?.text).toContain('support team will respond as soon as possible');
    expect(orders).toHaveLength(0);
  });

  it('sends account verification and password reset through support', async () => {
    const { service, orders, support } = useFakeSmtp();
    await service.sendEmailVerification(
      recipient,
      'https://www.last-dot.com/verify-email?token=fixture-verification',
    );
    await service.sendPasswordReset(
      recipient,
      'https://www.last-dot.com/reset-password?token=fixture-reset',
    );
    expect(support).toMatchObject([
      {
        from: { address: supportAddress },
        to: recipient.email,
        subject: 'Verify your email address',
      },
      { from: { address: supportAddress }, to: recipient.email, subject: 'Reset your password' },
    ]);
    expect(support[0]?.text).toContain('token=fixture-verification');
    expect(support[1]?.text).toContain('token=fixture-reset');
    expect(orders).toHaveLength(0);
  });

  it.each([ordersAddress, supportAddress])(
    'continues using the other mailbox when authentication fails for %s',
    async (failAuthFor) => {
      const { service } = useFakeSmtp({ failAuthFor });
      const sendOrder = () => service.sendOrderReceivedEmail(order);
      const sendSupport = () => service.sendContactAcknowledgement(recipient, 'Fixture');
      const [failure, working] =
        failAuthFor === ordersAddress ? [sendOrder, sendSupport] : [sendSupport, sendOrder];
      await expect(failure()).rejects.toMatchObject({ code: 'EAUTH' });
      await expect(working()).resolves.toBeUndefined();
    },
  );

  it.each([{ SUPPORT_SMTP_PASSWORD: '' }, { SUPPORT_SMTP_USER: 'ORDERS@LAST-DOT.COM' }])(
    'keeps orders available without falling back for an unavailable support transport',
    async (config) => {
      const { service, orders, transports } = useFakeSmtp({ config });
      await expect(service.sendContactAcknowledgement(recipient, 'Fixture')).rejects.toThrow(
        'unavailable',
      );
      await expect(service.sendOrderReceivedEmail(order)).resolves.toBeUndefined();
      expect(orders).toHaveLength(1);
      expect(transports).toHaveLength(1);
    },
  );
});
