import type { OrderMailDetails } from '../interfaces/mail-service.interface.js';
import { escapeHtml, formatEgp, humanize } from './mail-template.util.js';

export interface OrderEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

function customerName(order: OrderMailDetails): string {
  return [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ');
}

function itemDescription(item: OrderMailDetails['items'][number]): string {
  return [item.sku, item.colorName, item.size].filter(Boolean).join(' · ');
}

function receivedItemsText(order: OrderMailDetails): string {
  return order.items
    .map(
      (item) =>
        '- ' +
        item.productName +
        ' (' +
        itemDescription(item) +
        ') — Qty ' +
        String(item.quantity) +
        ' × ' +
        formatEgp(item.unitPricePiasters) +
        ' = ' +
        formatEgp(item.lineTotalPiasters),
    )
    .join('\n');
}

function receivedItemsHtml(order: OrderMailDetails): string {
  return order.items
    .map(
      (item) =>
        '<tr>' +
        "<td style='padding:14px 8px 14px 0;border-bottom:1px solid #e7e5e4;vertical-align:top'>" +
        "<strong style='display:block;color:#1c1917'>" +
        escapeHtml(item.productName) +
        '</strong>' +
        "<span style='font-size:12px;color:#78716c'>" +
        escapeHtml(itemDescription(item)) +
        '</span>' +
        '</td>' +
        "<td style='padding:14px 8px;border-bottom:1px solid #e7e5e4;text-align:center;vertical-align:top'>" +
        String(item.quantity) +
        '</td>' +
        "<td style='padding:14px 0 14px 8px;border-bottom:1px solid #e7e5e4;text-align:right;vertical-align:top;white-space:nowrap'>" +
        escapeHtml(formatEgp(item.unitPricePiasters)) +
        '</td>' +
        '</tr>',
    )
    .join('');
}

function totalsHtml(order: OrderMailDetails): string {
  const rows: Array<[string, number]> = [
    ['Subtotal', order.subtotalPiasters],
    ['Discount', -order.discountPiasters],
    ['Shipping', order.shippingPiasters],
    ['Total', order.totalPiasters],
  ];
  return rows
    .map(
      ([label, amount], index) =>
        '<tr>' +
        "<td style='padding:" +
        (index === rows.length - 1 ? '14px 0 0' : '6px 0') +
        ';border-top:' +
        (index === rows.length - 1 ? '1px solid #a8a29e' : '0') +
        ';font-weight:' +
        (index === rows.length - 1 ? '700' : '400') +
        "'>" +
        escapeHtml(label) +
        '</td>' +
        "<td style='padding:" +
        (index === rows.length - 1 ? '14px 0 0' : '6px 0') +
        ';border-top:' +
        (index === rows.length - 1 ? '1px solid #a8a29e' : '0') +
        ';text-align:right;font-weight:' +
        (index === rows.length - 1 ? '700' : '400') +
        "'>" +
        escapeHtml(formatEgp(amount)) +
        '</td>' +
        '</tr>',
    )
    .join('');
}

function emailShell(input: {
  eyebrow: string;
  title: string;
  introduction: string;
  orderNumber: string;
  content: string;
}): string {
  return [
    '<!doctype html>',
    "<html lang='en'>",
    '<head>',
    "<meta charset='utf-8'>",
    "<meta name='viewport' content='width=device-width,initial-scale=1'>",
    '<title>',
    escapeHtml(input.title),
    '</title>',
    '</head>',
    "<body style='margin:0;background:#f5f5f4;color:#1c1917;font-family:Arial,Helvetica,sans-serif'>",
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background:#f5f5f4'>",
    "<tr><td style='padding:24px 12px'>",
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4'>",
    "<tr><td style='padding:28px 32px;background:#1c1917;color:#ffffff'>",
    "<p style='margin:0;font-family:Georgia,Times,serif;font-size:28px;letter-spacing:.04em'>Last Dot</p>",
    '</td></tr>',
    "<tr><td style='padding:32px'>",
    "<p style='margin:0 0 10px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#78716c'>",
    escapeHtml(input.eyebrow),
    '</p>',
    "<h1 style='margin:0;font-family:Georgia,Times,serif;font-size:30px;font-weight:500;line-height:1.2'>",
    escapeHtml(input.title),
    '</h1>',
    "<p style='margin:18px 0 0;color:#57534e;line-height:1.65'>",
    escapeHtml(input.introduction),
    '</p>',
    "<div style='margin:24px 0;padding:16px 18px;background:#fafaf9;border-left:3px solid #1c1917'>",
    "<span style='display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#78716c'>Order number</span>",
    "<strong style='display:block;margin-top:5px;font-size:18px'>",
    escapeHtml(input.orderNumber),
    '</strong>',
    '</div>',
    input.content,
    "<p style='margin:32px 0 0;padding-top:20px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;line-height:1.6'>",
    'Questions about your order? Reply to this email and our team will help.',
    '</p>',
    '</td></tr>',
    "<tr><td style='padding:20px 32px;background:#fafaf9;font-size:11px;color:#78716c;text-align:center'>Last Dot · last-dot.com</td></tr>",
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}

export function buildOrderReceivedEmail(
  order: OrderMailDetails,
  hasReceipt = false,
): OrderEmailTemplate {
  const name = customerName(order);
  const introduction =
    'Your order has been received and saved. It is waiting for confirmation from our team. We will email you again once Last Dot confirms it.';
  const text = [
    'Hello ' + name + ',',
    '',
    introduction,
    '',
    'Order: ' + order.orderNumber,
    '',
    'Items',
    receivedItemsText(order),
    '',
    'Subtotal: ' + formatEgp(order.subtotalPiasters),
    'Discount: ' + formatEgp(order.discountPiasters),
    'Shipping: ' + formatEgp(order.shippingPiasters),
    'Total: ' + formatEgp(order.totalPiasters),
    'Payment: ' + humanize(order.paymentMethod),
    'Delivery: ' + order.shippingCity + ', ' + order.shippingGovernorateName,
    ...(hasReceipt ? ['', 'Your InstaPay transfer receipt is attached to this email.'] : []),
    '',
    'This email confirms receipt only; your order is not confirmed yet.',
  ].join('\n');
  const content = [
    "<p style='margin:0 0 20px'>Hello <strong>",
    escapeHtml(name),
    '</strong>,</p>',
    "<div style='margin:0 0 24px;padding:12px 14px;background:#fef3c7;color:#92400e;font-size:13px'>",
    'Waiting for confirmation — this order is not confirmed yet.',
    '</div>',
    "<h2 style='margin:0 0 8px;font-family:Georgia,Times,serif;font-size:22px;font-weight:500'>Your items</h2>",
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='font-size:14px'>",
    "<tr><th style='padding:8px 8px 8px 0;text-align:left;font-size:11px;color:#78716c;text-transform:uppercase'>Item</th>",
    "<th style='padding:8px;text-align:center;font-size:11px;color:#78716c;text-transform:uppercase'>Qty</th>",
    "<th style='padding:8px 0 8px 8px;text-align:right;font-size:11px;color:#78716c;text-transform:uppercase'>Unit price</th></tr>",
    receivedItemsHtml(order),
    '</table>',
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-top:20px;font-size:14px'>",
    totalsHtml(order),
    '</table>',
    "<p style='margin:24px 0 0;font-size:13px;color:#57534e;line-height:1.6'><strong>Payment:</strong> ",
    escapeHtml(humanize(order.paymentMethod)),
    '<br><strong>Delivery:</strong> ',
    escapeHtml(order.shippingCity + ', ' + order.shippingGovernorateName),
    '</p>',
    ...(hasReceipt
      ? [
          "<div style='margin:24px 0 0;padding-top:20px;border-top:1px solid #e7e5e4'>",
          "<h2 style='margin:0 0 12px;font-family:Georgia,Times,serif;font-size:22px;font-weight:500'>Transfer receipt</h2>",
          "<img src='cid:payment-receipt@last-dot' alt='Submitted InstaPay transfer receipt' style='display:block;max-width:100%;height:auto;border:1px solid #e7e5e4'>",
          "<p style='margin:10px 0 0;font-size:12px;color:#78716c'>The receipt is also attached to this email.</p>",
          '</div>',
        ]
      : []),
  ].join('');
  return {
    subject: 'We received your order #' + order.orderNumber,
    text,
    html: emailShell({
      eyebrow: 'Order received',
      title: 'We received your order',
      introduction,
      orderNumber: order.orderNumber,
      content,
    }),
  };
}

export function buildOrderConfirmedEmail(order: OrderMailDetails): OrderEmailTemplate {
  const name = customerName(order);
  const introduction =
    'Last Dot has confirmed your order. Our team will now prepare it for fulfilment.';
  const compactItems = order.items
    .map((item) => item.productName + ' × ' + String(item.quantity))
    .join(', ');
  const text = [
    'Hello ' + name + ',',
    '',
    introduction,
    '',
    'Order: ' + order.orderNumber,
    'Items: ' + compactItems,
    'Total: ' + formatEgp(order.totalPiasters),
    'Payment: ' + humanize(order.paymentMethod),
    'Delivery: ' + order.shippingCity + ', ' + order.shippingGovernorateName,
  ].join('\n');
  const content = [
    "<p style='margin:0 0 20px'>Hello <strong>",
    escapeHtml(name),
    '</strong>,</p>',
    "<div style='margin:0 0 24px;padding:12px 14px;background:#dcfce7;color:#166534;font-size:13px'>",
    'Confirmed by Last Dot',
    '</div>',
    "<h2 style='margin:0 0 10px;font-family:Georgia,Times,serif;font-size:22px;font-weight:500'>Order summary</h2>",
    "<p style='margin:0;color:#57534e;line-height:1.7'>",
    escapeHtml(compactItems),
    '</p>',
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-top:20px;font-size:14px'>",
    "<tr><td style='padding:14px 0;border-top:1px solid #a8a29e;font-weight:700'>Total</td>",
    "<td style='padding:14px 0;border-top:1px solid #a8a29e;text-align:right;font-weight:700'>",
    escapeHtml(formatEgp(order.totalPiasters)),
    '</td></tr></table>',
    "<p style='margin:16px 0 0;font-size:13px;color:#57534e;line-height:1.6'><strong>Delivery:</strong> ",
    escapeHtml(order.shippingCity + ', ' + order.shippingGovernorateName),
    '</p>',
  ].join('');
  return {
    subject: 'Your order #' + order.orderNumber + ' has been confirmed',
    text,
    html: emailShell({
      eyebrow: 'Order confirmed',
      title: 'Your order is confirmed',
      introduction,
      orderNumber: order.orderNumber,
      content,
    }),
  };
}

export function buildNewOrderNotificationEmail(order: OrderMailDetails): OrderEmailTemplate {
  const name = customerName(order);
  const introduction = 'A new order has been placed on the Last Dot store.';
  const text = [
    introduction,
    '',
    'Order: ' + order.orderNumber,
    'Customer: ' + name + ' <' + order.customerEmail + '>',
    'Status: ' + humanize(order.status),
    'Payment: ' + humanize(order.paymentMethod),
    'Delivery: ' + order.shippingCity + ', ' + order.shippingGovernorateName,
    '',
    'Items',
    receivedItemsText(order),
    '',
    'Subtotal: ' + formatEgp(order.subtotalPiasters),
    'Discount: ' + formatEgp(order.discountPiasters),
    'Shipping: ' + formatEgp(order.shippingPiasters),
    'Total: ' + formatEgp(order.totalPiasters),
  ].join('\n');
  const content = [
    "<p style='margin:0 0 20px'><strong>Customer:</strong> ",
    escapeHtml(name),
    '<br><strong>Email:</strong> ',
    escapeHtml(order.customerEmail),
    '</p>',
    "<h2 style='margin:0 0 8px;font-family:Georgia,Times,serif;font-size:22px;font-weight:500'>Order items</h2>",
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='font-size:14px'>",
    "<tr><th style='padding:8px 8px 8px 0;text-align:left;font-size:11px;color:#78716c;text-transform:uppercase'>Item</th>",
    "<th style='padding:8px;text-align:center;font-size:11px;color:#78716c;text-transform:uppercase'>Qty</th>",
    "<th style='padding:8px 0 8px 8px;text-align:right;font-size:11px;color:#78716c;text-transform:uppercase'>Unit price</th></tr>",
    receivedItemsHtml(order),
    '</table>',
    "<table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-top:20px;font-size:14px'>",
    totalsHtml(order),
    '</table>',
    "<p style='margin:24px 0 0;font-size:13px;color:#57534e;line-height:1.6'><strong>Status:</strong> ",
    escapeHtml(humanize(order.status)),
    '<br><strong>Payment:</strong> ',
    escapeHtml(humanize(order.paymentMethod)),
    '<br><strong>Delivery:</strong> ',
    escapeHtml(order.shippingCity + ', ' + order.shippingGovernorateName),
    '</p>',
  ].join('');
  return {
    subject: 'New order #' + order.orderNumber,
    text,
    html: emailShell({
      eyebrow: 'Merchant notification',
      title: 'A new order was placed',
      introduction,
      orderNumber: order.orderNumber,
      content,
    }),
  };
}
