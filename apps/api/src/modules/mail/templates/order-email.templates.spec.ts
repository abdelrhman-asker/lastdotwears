import type { OrderMailDetails } from '../interfaces/mail-service.interface.js';
import {
  buildNewOrderNotificationEmail,
  buildOrderConfirmedEmail,
  buildOrderReceivedEmail,
} from './order-email.templates.js';

const order: OrderMailDetails = {
  customerEmail: 'customer@example.com',
  customerFirstName: 'Sample',
  customerLastName: 'Customer',
  orderNumber: 'LDW-20260830-ABC12345',
  status: 'PENDING',
  subtotalPiasters: 100_000,
  discountPiasters: 10_000,
  shippingPiasters: 6_000,
  totalPiasters: 96_000,
  paymentMethod: 'CASH_ON_DELIVERY',
  shippingCity: 'Nasr City',
  shippingGovernorateName: 'Cairo',
  items: [
    {
      productName: 'Everyday Shirt',
      sku: 'SHIRT-BLK-M',
      size: 'M',
      colorName: 'Black',
      unitPricePiasters: 50_000,
      quantity: 2,
      lineTotalPiasters: 100_000,
    },
  ],
};

describe('order email templates', () => {
  it('builds a received email with full item pricing and an unconfirmed message', () => {
    const message = buildOrderReceivedEmail(order);

    expect(message.subject).toBe('We received your order #LDW-20260830-ABC12345');
    expect(message.text).toContain('Sample Customer');
    expect(message.text).toContain('Everyday Shirt');
    expect(message.text).toContain('Qty 2');
    expect(message.text).toContain('Subtotal:');
    expect(message.text).toContain('Shipping:');
    expect(message.text).toContain('Total:');
    expect(message.text).toContain('not confirmed yet');
    expect(message.html).toContain('Waiting for confirmation');
    expect(message.html).toContain('Unit price');
  });

  it('builds a concise confirmed email in HTML and plain text', () => {
    const message = buildOrderConfirmedEmail({ ...order, status: 'PROCESSING' });

    expect(message.subject).toBe('Your order #LDW-20260830-ABC12345 has been confirmed');
    expect(message.text).toContain('Last Dot has confirmed your order');
    expect(message.text).toContain('Everyday Shirt × 2');
    expect(message.html).toContain('Confirmed by Last Dot');
    expect(message.html).toContain('Order summary');
  });

  it('embeds the submitted InstaPay receipt in the received email', () => {
    const message = buildOrderReceivedEmail({ ...order, paymentMethod: 'INSTAPAY' }, true);

    expect(message.text).toContain('transfer receipt is attached');
    expect(message.html).toContain("src='cid:payment-receipt@last-dot'");
    expect(message.html).toContain('The receipt is also attached');
  });

  it('builds a merchant notification with the customer and order details', () => {
    const message = buildNewOrderNotificationEmail(order);

    expect(message.subject).toBe('New order #LDW-20260830-ABC12345');
    expect(message.text).toContain('Sample Customer <customer@example.com>');
    expect(message.text).toContain('Everyday Shirt');
    expect(message.text).toContain('Total:');
    expect(message.html).toContain('Merchant notification');
  });

  it('escapes customer and catalog values in HTML', () => {
    const message = buildOrderReceivedEmail({
      ...order,
      customerFirstName: '<script>alert(1)</script>',
      items: [{ ...order.items[0]!, productName: '<b>unsafe</b>' }],
    });

    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<b>unsafe</b>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('&lt;b&gt;unsafe&lt;/b&gt;');
  });
});
