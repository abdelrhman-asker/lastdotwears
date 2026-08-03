import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { InstaPayService } from '../../payments/services/instapay.service.js';
import type { MailService } from '../../mail/interfaces/mail-service.interface.js';
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
      method: 'CASH_ON_DELIVERY',
      status: 'PENDING',
      amountPiasters: 106_000,
      instaPayReference: null,
      confirmationNote: null,
      confirmedAt: null,
    },
    statusEvents: [],
  };
}

describe('OrdersService', () => {
  const mail = { sendOrderStatusUpdated: () => Promise.resolve() } as unknown as MailService;
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
    const service = new OrdersService(repository, {} as InstaPayService, mail);

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

  it('enforces the order transition policy before persistence', async () => {
    let transitioned = false;
    const repository = {
      findAdminOrder: () => Promise.resolve(order('WAITING_FOR_PAYMENT')),
      transition: () => {
        transitioned = true;
        return Promise.resolve('conflict' as const);
      },
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail);

    await expect(service.transition(actor, order().id, { status: 'PROCESSING' })).rejects.toThrow(
      'cannot move',
    );
    expect(transitioned).toBe(false);
  });

  it('passes an allowed transition with its optimistic expected state', async () => {
    const current = order('PENDING');
    let received: Parameters<OrdersRepository['transition']>[0] | null = null;
    const repository = {
      findAdminOrder: () => Promise.resolve(current),
      transition: (input: Parameters<OrdersRepository['transition']>[0]) => {
        received = input;
        return Promise.resolve({ ...current, status: 'PROCESSING' as const });
      },
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail);

    await service.transition(actor, current.id, { status: 'PROCESSING', note: 'Packed' });
    expect(received).toMatchObject({
      expectedStatus: 'PENDING',
      status: 'PROCESSING',
      note: 'Packed',
    });
  });

  it('maps invalid InstaPay confirmation state to a conflict', async () => {
    const repository = {
      confirmInstaPay: () => Promise.resolve('conflict' as const),
    } as unknown as OrdersRepository;
    const service = new OrdersService(repository, {} as InstaPayService, mail);

    await expect(service.confirmInstaPay(actor, order().id, {})).rejects.toThrow(
      'Only a waiting InstaPay order',
    );
  });
});
