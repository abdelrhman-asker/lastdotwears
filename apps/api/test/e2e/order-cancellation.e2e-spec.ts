import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma/prisma.service.js';
import { AuthTokenService } from '../../src/modules/auth/services/auth-token.service.js';
import {
  MAIL_SERVICE,
  type MailService,
} from '../../src/modules/mail/interfaces/mail-service.interface.js';

const fixtureUrl = process.env.ORDER_TEST_DATABASE_URL;
const describeWithDatabase = fixtureUrl ? describe : describe.skip;

describeWithDatabase('Order cancellation (disposable PostgreSQL)', () => {
  const csrf = 'fixture-csrf-token';
  const guest = randomBytes(32).toString('base64url');
  const guestTokenHash = createHash('sha256').update(guest).digest('hex');
  const cookie = `csrf_token=${csrf}`;
  let app: INestApplication | undefined;
  let server: Server;
  let prisma: PrismaService;
  let customer: Awaited<ReturnType<typeof createViewer>>;
  let otherCustomer: Awaited<ReturnType<typeof createViewer>>;
  let admin: Awaited<ReturnType<typeof createViewer>>;
  let mail: MailService;
  let restoreMail: () => void;

  beforeAll(async () => {
    const url = new URL(fixtureUrl!);
    if (
      url.protocol !== 'postgresql:' ||
      url.hostname !== '127.0.0.1' ||
      url.pathname !== '/lastdot_test'
    ) {
      throw new Error(
        'ORDER_TEST_DATABASE_URL must point to the disposable loopback lastdot_test database.',
      );
    }
    process.env.DATABASE_URL = url.href;
    process.env.MAIL_TRANSPORT = 'log';
    process.env.STORAGE_PROVIDER = 'local';
    const { createApplication } = await import('../../src/bootstrap.js');
    app = await createApplication();
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    mail = app.get<MailService>(MAIL_SERVICE);
    const originalMailMethods = {
      sendOrderCancelledEmail: mail.sendOrderCancelledEmail.bind(mail),
      sendOrderCancellationNotification: mail.sendOrderCancellationNotification.bind(mail),
      sendOrderConfirmedEmail: mail.sendOrderConfirmedEmail.bind(mail),
    };
    restoreMail = () => {
      Object.assign(mail, originalMailMethods);
    };
    [customer, otherCustomer, admin] = await Promise.all([
      createViewer('CUSTOMER'),
      createViewer('CUSTOMER'),
      createViewer('ADMIN'),
    ]);
  }, 30_000);

  afterEach(() => restoreMail?.());
  afterAll(async () => app?.close());

  async function createViewer(role: 'CUSTOMER' | 'ADMIN') {
    const user = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        firstName: 'Test',
        lastName: 'Shopper',
        passwordHash: 'unused-fixture-hash',
        isEmailVerified: true,
        role,
      },
    });
    const session = await prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const tokens = app!.get(AuthTokenService);
    return { id: user.id, token: await tokens.signAccessToken(user, session.id) };
  }

  async function createOrder(input: { userId?: string; instaPay?: boolean; proof?: boolean } = {}) {
    const suffix = randomBytes(7).toString('hex');
    const status = input.instaPay ? 'WAITING_FOR_PAYMENT' : 'PENDING';
    const method = input.instaPay ? 'INSTAPAY' : 'CASH_ON_DELIVERY';
    const variant = await prisma.productVariant.create({
      data: {
        product: {
          create: {
            name: 'Fixture Shirt',
            slug: `fixture-${suffix}`,
            description: 'Test fixture',
            pricePiasters: 50_000,
            sortPricePiasters: 50_000,
            category: { create: { name: 'Fixture', slug: `category-${suffix}` } },
            brand: { create: { name: 'Fixture', slug: `brand-${suffix}` } },
          },
        },
        sku: `SKU-${suffix}`,
        size: 'M',
        colorName: 'Black',
        combinationKey: 'm:black',
        stockQuantity: 8,
      },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `LDW-TEST-${suffix}`,
        invoiceNumber: `INV-TEST-${suffix}`,
        idempotencyKey: randomUUID(),
        ...(input.userId ? { userId: input.userId } : { guestTokenHash }),
        status,
        paymentMethod: method,
        paymentStatus: status,
        customerFirstName: 'Test',
        customerLastName: 'Shopper',
        customerEmail: 'shopper@example.test',
        customerPhone: '01012345678',
        shippingGovernorateCode: 'cairo',
        shippingGovernorateName: 'Cairo',
        shippingCity: 'Cairo',
        shippingAddressLine1: '12 Example Street',
        subtotalPiasters: 100_000,
        shippingPiasters: 5_000,
        totalPiasters: 105_000,
        items: {
          create: {
            variantId: variant.id,
            productName: 'Fixture Shirt',
            productSlug: `fixture-${suffix}`,
            sku: variant.sku,
            size: 'M',
            colorName: 'Black',
            unitPricePiasters: 50_000,
            quantity: 2,
            lineTotalPiasters: 100_000,
          },
        },
        payment: {
          create: {
            method,
            status,
            amountPiasters: 105_000,
            ...(input.proof
              ? {
                  proofImagePublicId: 'payment-proofs/fixture/receipt',
                  proofSubmittedAt: new Date(),
                }
              : {}),
          },
        },
      },
    });
    return { ...order, variantId: variant.id };
  }

  function cancel(orderNumber: string, token?: string, guestCookie?: string) {
    const operation = request(server)
      .post(`/api/v1/checkout/orders/${orderNumber}/cancel`)
      .set('Cookie', guestCookie ? `${cookie}; guest_cart=${guestCookie}` : cookie)
      .set('X-CSRF-Token', csrf);
    return token ? operation.auth(token, { type: 'bearer' }) : operation;
  }

  async function expectRelease(order: { id: string; variantId: string }, released: boolean) {
    const variant = await prisma.productVariant.findUniqueOrThrow({
      where: { id: order.variantId },
    });
    const movements = await prisma.inventoryMovement.findMany({
      where: { referenceId: order.id, type: 'RELEASE' },
    });
    expect(variant.stockQuantity).toBe(released ? 10 : 8);
    expect(movements).toHaveLength(released ? 1 : 0);
    if (released) expect(movements[0]).toMatchObject({ quantityDelta: 2, quantityAfter: 10 });
  }

  it('rejects anonymous, invalid guest, and other customer access and enforces guest CSRF', async () => {
    const registered = await createOrder({ userId: customer.id });
    const guestOrder = await createOrder();
    await cancel(registered.orderNumber).expect(404);
    await cancel(registered.orderNumber, otherCustomer.token, guest).expect(404);
    await cancel(guestOrder.orderNumber, undefined, 'A'.repeat(43)).expect(404);
    await request(server)
      .post(`/api/v1/checkout/orders/${guestOrder.orderNumber}/cancel`)
      .set('Cookie', `guest_cart=${guest}`)
      .expect(403);
    await cancel(guestOrder.orderNumber, undefined, guest)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED',
          canCancel: false,
        });
      });
    await expectRelease(guestOrder, true);
  });

  it('cancels COD once across concurrent requests and a retry, and sends both emails once', async () => {
    const order = await createOrder({ userId: customer.id });
    const buyer: string[] = [];
    const merchant: Array<[string, boolean]> = [];
    mail.sendOrderCancelledEmail = (details) => {
      buyer.push(details.orderNumber);
      return Promise.reject(new Error('fixture email failure'));
    };
    mail.sendOrderCancellationNotification = (details, review) => {
      merchant.push([details.paymentStatus, review]);
      return Promise.resolve();
    };
    const responses = await Promise.all([
      cancel(order.orderNumber, customer.token),
      cancel(order.orderNumber, customer.token),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    await cancel(order.orderNumber, customer.token).expect(200);
    await expectRelease(order, true);
    const events = await prisma.orderStatusEvent.findMany({ where: { orderId: order.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ toStatus: 'CANCELLED', actorId: customer.id });
    expect(buyer).toEqual([order.orderNumber]);
    expect(merchant).toEqual([['CANCELLED', false]]);
  });

  it('preserves the InstaPay proof and payment status and flags a manual refund review', async () => {
    const order = await createOrder({ instaPay: true, proof: true });
    const merchant: Array<[string, boolean]> = [];
    mail.sendOrderCancellationNotification = (details, review) => {
      merchant.push([details.id, review]);
      return Promise.resolve();
    };
    await cancel(order.orderNumber, undefined, guest)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'CANCELLED',
          paymentStatus: 'WAITING_FOR_PAYMENT',
          instaPayInstructions: null,
          needsRefundReview: true,
          statusEvents: [expect.objectContaining({ customerInitiated: true })],
        });
        expect(body).not.toHaveProperty('payment.proofImagePublicId');
      });
    expect(merchant).toEqual([[order.id, true]]);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment).toMatchObject({
      status: 'WAITING_FOR_PAYMENT',
      proofImagePublicId: 'payment-proofs/fixture/receipt',
    });
    await request(server)
      .post(`/api/v1/admin/orders/${order.id}/confirm-instapay`)
      .auth(admin.token, { type: 'bearer' })
      .send({})
      .expect(409);
    await expectRelease(order, true);
  });

  it('cancels an unsubmitted InstaPay payment and retains the coupon redemption', async () => {
    const order = await createOrder({ instaPay: true, userId: customer.id });
    const coupon = await prisma.coupon.create({
      data: {
        code: 'TEST-' + randomBytes(6).toString('hex').toUpperCase(),
        discountType: 'FIXED_AMOUNT',
        value: 1_000,
        timesUsed: 1,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: {
        couponId: coupon.id,
        couponCode: coupon.code,
        discountPiasters: 1_000,
        totalPiasters: 104_000,
        couponRedemption: {
          create: { couponId: coupon.id, userId: customer.id, discountPiasters: 1_000 },
        },
      },
    });
    await cancel(order.orderNumber, customer.token)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'CANCELLED',
          paymentStatus: 'CANCELLED',
          needsRefundReview: false,
        });
      });
    await expect(prisma.coupon.findUnique({ where: { id: coupon.id } })).resolves.toMatchObject({
      timesUsed: 1,
    });
    await expect(prisma.couponRedemption.count({ where: { orderId: order.id } })).resolves.toBe(1);
    await expectRelease(order, true);
  });

  it('rejects cancellation after admin confirmation and sends the confirmation update once', async () => {
    const order = await createOrder({ userId: customer.id });
    const confirmed: string[] = [];
    mail.sendOrderConfirmedEmail = (details) => {
      confirmed.push(details.orderNumber);
      return Promise.resolve();
    };
    const advance = () =>
      request(server)
        .patch(`/api/v1/admin/orders/${order.id}/status`)
        .auth(admin.token, { type: 'bearer' })
        .send({ status: 'PROCESSING' });
    await advance().expect(200);
    await advance().expect(400);
    await cancel(order.orderNumber, customer.token).expect(409);
    await expectRelease(order, false);
    expect(confirmed).toEqual([order.orderNumber]);
  });

  it('commits only one of simultaneous InstaPay confirmation and customer cancellation', async () => {
    const order = await createOrder({ userId: customer.id, instaPay: true, proof: true });
    const [cancelled, confirmed] = await Promise.all([
      cancel(order.orderNumber, customer.token),
      request(server)
        .post(`/api/v1/admin/orders/${order.id}/confirm-instapay`)
        .auth(admin.token, { type: 'bearer' })
        .send({}),
    ]);
    const status = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect([cancelled.status, confirmed.status]).toEqual(
      status.status === 'CANCELLED' ? [200, 409] : [409, 201],
    );
    expect(['CANCELLED', 'PAID']).toContain(status.status);
    await expectRelease(order, status.status === 'CANCELLED');
  });
});
