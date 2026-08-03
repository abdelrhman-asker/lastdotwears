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

const settings = {
  paymentSettings: () => Promise.resolve({ cashOnDeliveryEnabled: true, instaPayEnabled: true }),
} as unknown as SettingsService;
const mail = { sendOrderPlaced: () => Promise.resolve() } as unknown as MailService;

describe('CheckoutService', () => {
  it('requires email verification before repository access', async () => {
    let called = false;
    const repository = {
      quote: () => {
        called = true;
        return Promise.resolve({ kind: 'empty_cart' as const });
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
      service.quote(
        { ...user, isEmailVerified: false },
        { userId: user.id },
        { governorateCode: 'cairo' },
      ),
    ).rejects.toThrow('Verify your email');
    expect(called).toBe(false);
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

  it('allows an idempotent replay after the original order cleared the cart', async () => {
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
    ).resolves.toMatchObject({ orderNumber: 'LDW-20260802-ABC12345' });
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
