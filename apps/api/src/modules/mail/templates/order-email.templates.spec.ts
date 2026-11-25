import type { AdminOrderMailDetails } from '../interfaces/mail-service.interface.js';
import {
  buildNewOrderNotificationEmail,
  buildOrderCancelledEmail,
  buildOrderConfirmedEmail,
  buildOrderReceivedEmail,
} from './order-email.templates.js';

const order: AdminOrderMailDetails = {
  id: 'order-id',
  createdAt: new Date('2026-08-30T10:00:00Z'),
  customerPhone: '01012345678',
  paymentStatus: 'PENDING',
  shippingAddressLine1: '12 Example Street',
  shippingAddressLine2: 'Flat 4',
  shippingPostalCode: '11511',
  deliveryNotes: 'Call <before> delivery',
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
    const url = 'https://www.last-dot.com/admin/orders/order-id';
    const message = buildNewOrderNotificationEmail(order, url);

    expect(message.subject).toBe('New order #LDW-20260830-ABC12345');
    for (const detail of [
      'Sample Customer',
      'customer@example.com',
      '2026-08-30T10:00:00.000Z',
      '01012345678',
      '12 Example Street, Flat 4, Nasr City, Cairo, 11511',
      'Everyday Shirt',
      'SHIRT-BLK-M',
      'Black',
      'Qty 2',
      'Subtotal:',
      'Discount:',
      'Shipping:',
      'Total:',
      'Payment status:',
      'Order status:',
      'Call <before> delivery',
      url,
    ])
      expect(message.text).toContain(detail);
    expect(message.html).toContain('Merchant notification');
    expect(message.html).toContain('Call &lt;before&gt; delivery');
  });

  it('keeps the manual refund alert in the merchant cancellation notification', () => {
    const url = 'https://www.last-dot.com/admin/orders/order-id';
    const customer = buildOrderCancelledEmail(order);
    const admin = buildOrderCancelledEmail(order, { url, refundReview: true });
    expect(customer.text).toContain('Your order has been cancelled');
    expect(customer.text).not.toContain(url);
    expect(admin.text).toContain(url);
    expect(admin.html).toContain('manual refund');
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
