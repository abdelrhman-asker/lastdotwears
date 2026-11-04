import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { InstaPayService } from '../../payments/services/instapay.service.js';
import type { MailService } from '../../mail/interfaces/mail-service.interface.js';
import type { ImageStorage } from '../../uploads/interfaces/image-storage.interface.js';
import type { OrderRecord } from '../interfaces/order.interface.js';
import type { OrdersRepository } from '../interfaces/orders-repository.interface.js';
import { OrdersService } from './orders.service.js';

const actor: AuthenticatedUser = {
  id: '24db60ac-d47b-45af-a5ca-34182397cdf4',
  sessionId: '498e93e1-802e-4134-ae22-53a1cd0646dc',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  isEmailVerified: true,
};

function order(status: OrderRecord['status'] = 'PENDING'): OrderRecord {
  const now = new Date('2026-08-02T00:00:00Z');
  return {
    id: '838c7a4f-4e76-4491-ac98-40cb56d0299c',
    orderNumber: 'LDW-20260802-ABC12345',
    invoiceNumber: 'INV-20260802-ABC12345',
    userId: '3da7ec62-c21f-48c3-9cb7-337277ffea1f',
    status,
    paymentMethod: status === 'WAITING_FOR_PAYMENT' ? 'INSTAPAY' : 'CASH_ON_DELIVERY',
    paymentStatus: status === 'WAITING_FOR_PAYMENT' ? 'WAITING_FOR_PAYMENT' : 'PENDING',
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
    items: [],
    payment: {
      id: '2e87929f-063e-4a50-878d-e75b2840e62b',
      method: status === 'WAITING_FOR_PAYMENT' ? 'INSTAPAY' : 'CASH_ON_DELIVERY',
      status: status === 'WAITING_FOR_PAYMENT' ? 'WAITING_FOR_PAYMENT' : 'PENDING',
      amountPiasters: 106_000,
      proofImagePublicId: null,
      proofSubmittedAt: null,
      instaPayReference: null,
      confirmationNote: null,
      confirmedAt: null,
    },
    statusEvents: [],
  };
}

describe('OrdersService', () => {
  const mail = { sendOrderConfirmedEmail: () => Promise.resolve() } as unknown as MailService;
  const imageStorage = {} as ImageStorage;
  it('returns a customer-scoped paginated order history', async () => {
    const summary = {
      id: order().id,
      orderNumber: order().orderNumber,
      status: 'DELIVERED' as const,
      paymentMethod: 'CASH_ON_DELIVERY' as const,
      paymentStatus: 'PAID' as const,
      totalPiasters: 106_000,
      placedAt: new Date('2026-08-02T00:00:00Z'),
      itemCount: 2,
      previewItems: [],
    };
    let received: Parameters<OrdersRepository['listCustomer']>[0] | null = null;
    const repository = {
      listCustomer: (input: Parameters<OrdersRepository['listCustomer']>[0]) => {
        received = input;
        return Promise.resolve({ items: [summary], total: 1 });
      },
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail, imageStorage);

    await expect(
      service.listCustomer(order().userId, { page: 1, limit: 12, status: 'DELIVERED' }),
    ).resolves.toMatchObject({ items: [summary], total: 1, totalPages: 1 });
    expect(received).toEqual({
      userId: order().userId,
      page: 1,
      limit: 12,
      status: 'DELIVERED',
    });
  });

  it('submits an InstaPay receipt once and triggers the received email afterward', async () => {
    const current = order('WAITING_FOR_PAYMENT');
    const submitted = {
      ...current,
      payment: {
        ...current.payment,
        proofImagePublicId: `payment-proofs/${current.userId}/receipt.png`,
        proofSubmittedAt: new Date('2026-08-30T10:05:00Z'),
      },
    };
    const emailedOrders: OrderRecord[] = [];
    const emailedReceipts: Array<{ path: string; contentType: string } | undefined> = [];
    const repository = {
      findCustomerOrder: () => Promise.resolve(current),
      submitInstaPayProof: () => Promise.resolve(submitted),
    } as unknown as OrdersRepository;
    const storage = {
      uploadPaymentProof: () =>
        Promise.resolve({
          publicId: submitted.payment.proofImagePublicId,
          secureUrl: '/unused',
          width: 800,
          height: 1200,
          format: 'png',
          bytes: 100,
        }),
      deleteImage: () => Promise.resolve(),
      readImage: () =>
        Promise.resolve({
          path: 'D:/receipts/receipt.png',
          contentType: 'image/png',
          bytes: 100,
        }),
    } as unknown as ImageStorage;
    const service = new OrdersService(
      repository,
      {
        instructions: () =>
          Promise.resolve({
            instaPayId: 'store@instapay',
            qrCodeDataUrl: 'data:image/png;base64,abc',
            instructions: 'Transfer the total.',
            amountPiasters: current.totalPiasters,
            orderNumber: current.orderNumber,
          }),
      } as unknown as InstaPayService,
      {
        sendOrderReceivedEmail: (
          emailedOrder: OrderRecord,
          receipt?: { path: string; contentType: string },
        ) => {
          emailedOrders.push(emailedOrder);
          emailedReceipts.push(receipt);
          return Promise.resolve();
        },
      } as unknown as MailService,
      storage,
    );

    const response = await service.submitInstaPayProof(current.userId, current.orderNumber, {
      buffer: Buffer.from('receipt'),
    } as Express.Multer.File);
    expect(response).toMatchObject({
      orderNumber: current.orderNumber,
      payment: { proofSubmittedAt: submitted.payment.proofSubmittedAt },
    });
    expect(response.payment).not.toHaveProperty('proofImagePublicId');
    expect(emailedOrders).toEqual([submitted]);
    expect(emailedReceipts).toEqual([
      { path: 'D:/receipts/receipt.png', contentType: 'image/png', bytes: 100 },
    ]);
  });

  it('removes a newly uploaded receipt when proof persistence conflicts', async () => {
    const current = order('WAITING_FOR_PAYMENT');
    const deleted: string[] = [];
    const repository = {
      findCustomerOrder: () => Promise.resolve(current),
      submitInstaPayProof: () => Promise.resolve('conflict' as const),
    } as unknown as OrdersRepository;
    const storage = {
      uploadPaymentProof: () =>
        Promise.resolve({
          publicId: 'payment-proofs/customer/receipt.png',
          secureUrl: '/unused',
          width: 800,
          height: 1200,
          format: 'png',
          bytes: 100,
        }),
      deleteImage: (publicId: string) => {
        deleted.push(publicId);
        return Promise.resolve();
      },
    } as unknown as ImageStorage;
    const service = new OrdersService(repository, {} as InstaPayService, mail, storage);

    await expect(
      service.submitInstaPayProof(current.userId, current.orderNumber, {
        buffer: Buffer.from('receipt'),
      } as Express.Multer.File),
    ).rejects.toThrow('already submitted or the order changed');
    expect(deleted).toEqual(['payment-proofs/customer/receipt.png']);
  });

  it('enforces the order transition policy before persistence', async () => {
    let transitioned = false;
    const repository = {
      findAdminOrder: () => Promise.resolve(order('WAITING_FOR_PAYMENT')),
      transition: () => {
        transitioned = true;
        return Promise.resolve('conflict' as const);
      },
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail, imageStorage);

    await expect(service.transition(actor, order().id, { status: 'PROCESSING' })).rejects.toThrow(
      'cannot move',
    );
    expect(transitioned).toBe(false);
  });

  it('sends one confirmation email after a pending order becomes processing', async () => {
    const current = order('PENDING');
    const confirmed = { ...current, status: 'PROCESSING' as const };
    const emailedOrders: OrderRecord[] = [];
    const sendOrderConfirmedEmail = (emailedOrder: OrderRecord) => {
      emailedOrders.push(emailedOrder);
      return Promise.resolve();
    };
    let received: Parameters<OrdersRepository['transition']>[0] | null = null;
    const repository = {
      findAdminOrder: () => Promise.resolve(current),
      transition: (input: Parameters<OrdersRepository['transition']>[0]) => {
        received = input;
        return Promise.resolve(confirmed);
      },
    } as unknown as OrdersRepository;
    const service = new OrdersService(
      repository,
      {} as InstaPayService,
      {
        sendOrderConfirmedEmail,
      } as unknown as MailService,
      imageStorage,
    );

    await service.transition(actor, current.id, { status: 'PROCESSING', note: 'Packed' });
    expect(received).toMatchObject({
      expectedStatus: 'PENDING',
      status: 'PROCESSING',
      note: 'Packed',
    });
    expect(emailedOrders).toEqual([confirmed]);
  });

  it('does not resend confirmation when an already confirmed order is updated', async () => {
    const current = order('PROCESSING');
    const shipped = { ...current, status: 'SHIPPED' as const };
    let emailCalls = 0;
    const sendOrderConfirmedEmail = () => {
      emailCalls += 1;
      return Promise.resolve();
    };
    const repository = {
      findAdminOrder: () => Promise.resolve(current),
      transition: () => Promise.resolve(shipped),
    } as unknown as OrdersRepository;
    const service = new OrdersService(
      repository,
      {} as InstaPayService,
      {
        sendOrderConfirmedEmail,
      } as unknown as MailService,
      imageStorage,
    );

    await expect(
      service.transition(actor, current.id, { status: 'SHIPPED' }),
    ).resolves.toMatchObject({ status: 'SHIPPED' });
    expect(emailCalls).toBe(0);
  });

  it('sends confirmation for the explicit InstaPay confirmation transition', async () => {
    const current = order('WAITING_FOR_PAYMENT');
    const confirmed = {
      ...current,
      status: 'PAID' as const,
      paymentStatus: 'PAID' as const,
      payment: { ...current.payment, status: 'PAID' as const, confirmedAt: new Date() },
    };
    const emailedOrders: OrderRecord[] = [];
    const sendOrderConfirmedEmail = (emailedOrder: OrderRecord) => {
      emailedOrders.push(emailedOrder);
      return Promise.resolve();
    };
    const repository = {
      confirmInstaPay: () => Promise.resolve(confirmed),
    } as unknown as OrdersRepository;
    const service = new OrdersService(
      repository,
      {} as InstaPayService,
      {
        sendOrderConfirmedEmail,
      } as unknown as MailService,
      imageStorage,
    );

    await service.confirmInstaPay(actor, current.id, { reference: 'TRANSFER-123' });
    expect(emailedOrders).toEqual([confirmed]);
  });

  it('keeps the admin confirmation successful when the email provider fails', async () => {
    const current = order('PENDING');
    const confirmed = { ...current, status: 'PROCESSING' as const };
    const repository = {
      findAdminOrder: () => Promise.resolve(current),
      transition: () => Promise.resolve(confirmed),
    } as unknown as OrdersRepository;
    const service = new OrdersService(
      repository,
      {} as InstaPayService,
      {
        sendOrderConfirmedEmail: () => Promise.reject(new Error('SMTP unavailable')),
      } as unknown as MailService,
      imageStorage,
    );

    await expect(
      service.transition(actor, current.id, { status: 'PROCESSING' }),
    ).resolves.toMatchObject({ status: 'PROCESSING' });
  });

  it('maps invalid InstaPay confirmation state to a conflict', async () => {
    const repository = {
      confirmInstaPay: () => Promise.resolve('conflict' as const),
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail, imageStorage);

    await expect(service.confirmInstaPay(actor, order().id, {})).rejects.toThrow(
      'Only a waiting InstaPay order',
    );
  });
});
