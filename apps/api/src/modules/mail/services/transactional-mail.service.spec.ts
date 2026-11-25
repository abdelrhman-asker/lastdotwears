import { Readable } from 'node:stream';

import { ConfigService } from '@nestjs/config';
import nodemailer, { type SendMailOptions } from 'nodemailer';

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

function useFakeSmtp(accepted: string[]) {
  const messages: SendMailOptions[] = [];
  const sendMail = (message: SendMailOptions) => {
    messages.push(message);
    return Promise.resolve({ accepted });
  };
  nodemailer.createTransport = (() => ({ sendMail })) as typeof createTransport;
  const service = new TransactionalMailService(
    new ConfigService({
      MAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: 465,
      SMTP_SECURE: true,
      MAIL_FROM_NAME: 'Last Dot',
      MAIL_FROM_EMAIL: 'orders@last-dot.com',
      ORDER_NOTIFICATION_EMAIL: 'orders@last-dot.com',
      WEB_APP_URL: 'https://www.last-dot.com',
    }),
  );
  return { service, messages };
}

describe('TransactionalMailService order notifications', () => {
  it('sends the merchant a dashboard link and streamed proof without a receipt URL', async () => {
    const { service, messages } = useFakeSmtp(['orders@last-dot.com']);
    const stream = Readable.from([Buffer.from('receipt fixture')]);
    await service.sendNewOrderNotification(order, { stream, contentType: 'image/png' }, true);
    const message = messages[0];
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
    stream.destroy();
  });

  it('surfaces a delivery failure when SMTP accepts no recipients', async () => {
    const { service } = useFakeSmtp([]);
    await expect(service.sendNewOrderNotification(order)).rejects.toMatchObject({
      code: 'ERECIPIENT',
    });
  });
});
