import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { CartService } from '../../cart/services/cart.service.js';
import type { OrdersService } from '../../orders/services/orders.service.js';
import type { OrderRecord } from '../../orders/interfaces/order.interface.js';
import type { SettingsService } from '../../settings/services/settings.service.js';
import type { MailService } from '../../mail/interfaces/mail-service.interface.js';
import type { CheckoutRepository } from '../interfaces/checkout-repository.interface.js';
import { CheckoutService } from './checkout.service.js';

const user: AuthenticatedUser = {
  id: 'b2c6382f-bd5f-4ad9-a5f4-2ab4789fd9a1',
  sessionId: 'b0241b8f-27b3-49bb-a661-d9a6c9893a63',
  email: 'customer@example.com',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  isEmailVerified: true,
};

const cart = {
  id: '93e9d278-9c68-4939-8c0f-0fd4083e2aa8',
  items: [{ id: 'item' }],
  itemCount: 1,
  subtotalPiasters: 100_000,
  hasUnavailableItems: false,
  updatedAt: new Date(),
};

const now = new Date('2026-08-30T10:00:00Z');
const placedOrder: OrderRecord = {
  id: '838c7a4f-4e76-4491-ac98-40cb56d0299c',
  orderNumber: 'LDW-20260830-ABC12345',
  invoiceNumber: 'INV-20260830-ABC12345',
  userId: user.id,
  status: 'PENDING',
  paymentMethod: 'CASH_ON_DELIVERY',
  paymentStatus: 'PENDING',
  customerFirstName: 'Sample',
  customerLastName: 'Customer',
  customerEmail: 'customer@example.com',
  customerPhone: '01012345678',
  shippingGovernorateCode: 'cairo',
  shippingGovernorateName: 'Cairo',
  shippingCity: 'Nasr City',
  shippingAddressLine1: '12 Example Street',
  shippingAddressLine2: null,
  shippingPostalCode: null,
  deliveryNotes: null,
  couponCode: null,
  subtotalPiasters: 100_000,
  discountPiasters: 0,
  shippingPiasters: 6_000,
  totalPiasters: 106_000,
  placedAt: now,
  createdAt: now,
  updatedAt: now,
  items: [
    {
      id: '4e915c91-23fb-48f2-8227-463f36b9770d',
      productId: null,
      variantId: null,
      productName: 'Everyday Shirt',
      productSlug: 'everyday-shirt',
      sku: 'SHIRT-BLK-M',
      size: 'M',
      colorName: 'Black',
      colorHex: '#000000',
      imageUrl: null,
      unitPricePiasters: 50_000,
      quantity: 2,
      lineTotalPiasters: 100_000,
    },
  ],
  payment: {
    id: '2e87929f-063e-4a50-878d-e75b2840e62b',
    method: 'CASH_ON_DELIVERY',
    status: 'PENDING',
    amountPiasters: 106_000,
    proofImagePublicId: null,
    proofSubmittedAt: null,
    instaPayReference: null,
    confirmationNote: null,
    confirmedAt: null,
  },
  statusEvents: [],
};

const placeInput = {
  idempotencyKey: 'df6e234a-af62-45a3-b0d1-7783d8bf4337',
  governorateCode: 'cairo',
  paymentMethod: 'CASH_ON_DELIVERY' as const,
  customerFirstName: 'Sample',
  customerLastName: 'Customer',
  customerEmail: 'customer@example.com',
  customerPhone: '01012345678',
  shippingCity: 'Cairo',
  shippingAddressLine1: '12 Example Street',
};

const settings = {
  paymentSettings: () => Promise.resolve({ cashOnDeliveryEnabled: true, instaPayEnabled: true }),
} as unknown as SettingsService;
const mail = {
  sendOrderReceivedEmail: () => Promise.resolve(),
  sendNewOrderNotification: () => Promise.resolve(),
} as unknown as MailService;

describe('CheckoutService', () => {
  it('allows checkout without a signed-in account', async () => {
    let called = false;
    const repository = {
      quote: (owner: { guestTokenHash?: string }) => {
        called = true;
        expect(owner.guestTokenHash).toBe('guest-hash');
        return Promise.resolve({
          kind: 'ok' as const,
          quote: {
            subtotalPiasters: 100_000,
            discountPiasters: 0,
            shippingPiasters: 6_000,
            totalPiasters: 106_000,
            couponCode: null,
            shipping: {
              governorateCode: 'cairo',
              governorateName: 'Cairo',
              estimatedMinDays: 1,
              estimatedMaxDays: 3,
            },
          },
        });
      },
    } as unknown as CheckoutRepository;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      {} as OrdersService,
      settings,
      mail,
    );

    await expect(
      service.quote(undefined, { guestTokenHash: 'guest-hash' }, { governorateCode: 'cairo' }),
    ).resolves.toMatchObject({ totalPiasters: 106_000 });
    expect(called).toBe(true);
  });

  it('returns a fully server-calculated quote', async () => {
    const quote = {
      subtotalPiasters: 100_000,
      discountPiasters: 10_000,
      shippingPiasters: 6_000,
      totalPiasters: 96_000,
      couponCode: 'WELCOME10',
      shipping: {
        governorateCode: 'cairo',
        governorateName: 'Cairo',
        estimatedMinDays: 1,
        estimatedMaxDays: 3,
      },
    };
    const repository = {
      quote: () => Promise.resolve({ kind: 'ok' as const, quote }),
    } as unknown as CheckoutRepository;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      {} as OrdersService,
      settings,
      mail,
    );

    await expect(
      service.quote(
        user,
        { userId: user.id },
        { governorateCode: 'cairo', couponCode: 'WELCOME10' },
      ),
    ).resolves.toEqual(quote);
  });

  it('blocks checkout when the live cart contains an unavailable item', async () => {
    const service = new CheckoutService(
      {} as CheckoutRepository,
      {
        get: () => Promise.resolve({ ...cart, hasUnavailableItems: true }),
      } as unknown as CartService,
      {} as OrdersService,
      settings,
      mail,
    );
    await expect(
      service.quote(user, { userId: user.id }, { governorateCode: 'cairo' }),
    ).rejects.toThrow('Update unavailable');
  });

  it('sends the customer and merchant emails only after a new COD order is saved', async () => {
    const events: string[] = [];
    const emailedOrders: OrderRecord[] = [];
    const sendOrderReceivedEmail = (order: OrderRecord) => {
      events.push('email');
      emailedOrders.push(order);
      return Promise.resolve();
    };
    const repository = {
      place: () => {
        events.push('saved');
        return Promise.resolve({
          kind: 'ok' as const,
          order: placedOrder,
          idempotentReplay: false,
        });
      },
    } as unknown as CheckoutRepository;
    const orders = {
      toResponse: () => Promise.resolve({ ...placedOrder, instaPayInstructions: null }),
    } as unknown as OrdersService;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      orders,
      settings,
      {
        sendOrderReceivedEmail,
        sendNewOrderNotification: () => {
          events.push('merchant-email');
          return Promise.resolve();
        },
      } as unknown as MailService,
    );

    await expect(service.place(user, { userId: user.id }, placeInput)).resolves.toMatchObject({
      orderNumber: placedOrder.orderNumber,
    });
    expect(events).toEqual(['saved', 'merchant-email', 'email']);
    expect(emailedOrders).toEqual([placedOrder]);
  });

  it('notifies the merchant immediately but waits for an InstaPay receipt before emailing the customer', async () => {
    let emailCalls = 0;
    let merchantEmailCalls = 0;
    const waitingOrder: OrderRecord = {
      ...placedOrder,
      status: 'WAITING_FOR_PAYMENT',
      paymentMethod: 'INSTAPAY',
      paymentStatus: 'WAITING_FOR_PAYMENT',
      payment: {
        ...placedOrder.payment,
        method: 'INSTAPAY',
        status: 'WAITING_FOR_PAYMENT',
      },
    };
    const repository = {
      place: () =>
        Promise.resolve({
          kind: 'ok' as const,
          order: waitingOrder,
          idempotentReplay: false,
        }),
    } as unknown as CheckoutRepository;
    const orders = {
      toResponse: () => Promise.resolve({ ...waitingOrder, instaPayInstructions: {} }),
    } as unknown as OrdersService;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      orders,
      settings,
      {
        sendOrderReceivedEmail: () => {
          emailCalls += 1;
          return Promise.resolve();
        },
        sendNewOrderNotification: () => {
          merchantEmailCalls += 1;
          return Promise.resolve();
        },
      } as unknown as MailService,
    );

    await expect(
      service.place(user, { userId: user.id }, { ...placeInput, paymentMethod: 'INSTAPAY' }),
    ).resolves.toMatchObject({ orderNumber: waitingOrder.orderNumber });
    expect(emailCalls).toBe(0);
    expect(merchantEmailCalls).toBe(1);
  });

  it('does not send an email when order creation fails', async () => {
    let emailCalls = 0;
    const sendOrderReceivedEmail = () => {
      emailCalls += 1;
      return Promise.resolve();
    };
    const repository = {
      place: () => Promise.resolve({ kind: 'empty_cart' as const }),
    } as unknown as CheckoutRepository;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      {} as OrdersService,
      settings,
      {
        sendOrderReceivedEmail,
        sendNewOrderNotification: sendOrderReceivedEmail,
      } as unknown as MailService,
    );

    await expect(service.place(user, { userId: user.id }, placeInput)).rejects.toThrow(
      'shopping bag is empty',
    );
    expect(emailCalls).toBe(0);
  });

  it('keeps a saved order successful when the email provider fails', async () => {
    const repository = {
      place: () =>
        Promise.resolve({
          kind: 'ok' as const,
          order: placedOrder,
          idempotentReplay: false,
        }),
    } as unknown as CheckoutRepository;
    const orders = {
      toResponse: () => Promise.resolve({ ...placedOrder, instaPayInstructions: null }),
    } as unknown as OrdersService;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      orders,
      settings,
      {
        sendOrderReceivedEmail: () => Promise.reject(new Error('SMTP unavailable')),
        sendNewOrderNotification: () => Promise.reject(new Error('SMTP unavailable')),
      } as unknown as MailService,
    );

    await expect(service.place(user, { userId: user.id }, placeInput)).resolves.toMatchObject({
      orderNumber: placedOrder.orderNumber,
    });
  });

  it('never attaches SMTP credentials to the order response', async () => {
    const smtpPassword = 'smtp-secret-that-must-stay-server-side';
    const previousPassword = process.env.SMTP_PASSWORD;
    process.env.SMTP_PASSWORD = smtpPassword;
    const repository = {
      place: () =>
        Promise.resolve({
          kind: 'ok' as const,
          order: placedOrder,
          idempotentReplay: false,
        }),
    } as unknown as CheckoutRepository;
    const orders = {
      toResponse: () => Promise.resolve({ ...placedOrder, instaPayInstructions: null }),
    } as unknown as OrdersService;
    const service = new CheckoutService(
      repository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      orders,
      settings,
      mail,
    );

    try {
      const response = await service.place(user, { userId: user.id }, placeInput);
      const serialized = JSON.stringify(response);
      expect(serialized).not.toContain(smtpPassword);
      expect(serialized).not.toContain('SMTP_PASSWORD');
    } finally {
      if (previousPassword === undefined) delete process.env.SMTP_PASSWORD;
      else process.env.SMTP_PASSWORD = previousPassword;
    }
  });

  it('allows an idempotent replay after the original order cleared the cart', async () => {
    let emailCalls = 0;
    const sendOrderReceivedEmail = () => {
      emailCalls += 1;
      return Promise.resolve();
    };
    const repository = {
      place: () =>
        Promise.resolve({
          kind: 'ok' as const,
          order: {} as OrderRecord,
          idempotentReplay: true,
        }),
    } as unknown as CheckoutRepository;
    const orders = {
      toResponse: () => Promise.resolve({ orderNumber: 'LDW-20260802-ABC12345' }),
    } as unknown as OrdersService;
    const service = new CheckoutService(
      repository,
      {
        get: () => Promise.resolve({ ...cart, items: [], itemCount: 0 }),
      } as unknown as CartService,
      orders,
      settings,
      { sendOrderReceivedEmail } as unknown as MailService,
    );

    await expect(
      service.place(
        user,
        { userId: user.id },
        {
          idempotencyKey: 'df6e234a-af62-45a3-b0d1-7783d8bf4337',
          governorateCode: 'cairo',
          paymentMethod: 'CASH_ON_DELIVERY',
          customerFirstName: 'Sample',
          customerLastName: 'Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '01012345678',
          shippingCity: 'Cairo',
          shippingAddressLine1: '12 Example Street',
        },
      ),
    ).resolves.toMatchObject({ orderNumber: 'LDW-20260802-ABC12345' });
    expect(emailCalls).toBe(0);
  });

  it('rejects a payment method disabled by store settings', async () => {
    const service = new CheckoutService(
      {} as CheckoutRepository,
      { get: () => Promise.resolve(cart) } as unknown as CartService,
      {} as OrdersService,
      {
        paymentSettings: () =>
          Promise.resolve({ cashOnDeliveryEnabled: false, instaPayEnabled: true }),
      } as unknown as SettingsService,
      mail,
    );

    await expect(
      service.place(
        user,
        { userId: user.id },
        {
          idempotencyKey: 'df6e234a-af62-45a3-b0d1-7783d8bf4337',
          governorateCode: 'cairo',
          paymentMethod: 'CASH_ON_DELIVERY',
          customerFirstName: 'Sample',
          customerLastName: 'Customer',
          customerEmail: 'customer@example.com',
          customerPhone: '01012345678',
          shippingCity: 'Cairo',
          shippingAddressLine1: '12 Example Street',
        },
      ),
    ).rejects.toThrow('temporarily unavailable');
  });
});
