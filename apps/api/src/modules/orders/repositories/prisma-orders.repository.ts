import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type {
  OrderRecord,
  OrderStatus,
  OrderSummaryRecord,
  PaymentStatus,
} from '../interfaces/order.interface.js';
import type { OrdersRepository } from '../interfaces/orders-repository.interface.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';

const orderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
  statusEvents: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

type OrderEntity = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const customerOrderSummarySelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  totalPiasters: true,
  placedAt: true,
  items: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      productName: true,
      productSlug: true,
      imageUrl: true,
      quantity: true,
    },
  },
} satisfies Prisma.OrderSelect;

type CustomerOrderSummaryEntity = Prisma.OrderGetPayload<{
  select: typeof customerOrderSummarySelect;
}>;

function mapOrderSummary(order: CustomerOrderSummaryEntity): OrderSummaryRecord {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalPiasters: order.totalPiasters,
    placedAt: order.placedAt,
    itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
    previewItems: order.items.slice(0, 3),
  };
}

export function mapOrder(order: OrderEntity): OrderRecord {
  if (!order.payment) throw new Error('Order payment record is missing.');
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    userId: order.userId,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerFirstName: order.customerFirstName,
    customerLastName: order.customerLastName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingGovernorateCode: order.shippingGovernorateCode,
    shippingGovernorateName: order.shippingGovernorateName,
    shippingCity: order.shippingCity,
    shippingAddressLine1: order.shippingAddressLine1,
    shippingAddressLine2: order.shippingAddressLine2,
    shippingPostalCode: order.shippingPostalCode,
    deliveryNotes: order.deliveryNotes,
    couponCode: order.couponCode,
    subtotalPiasters: order.subtotalPiasters,
    discountPiasters: order.discountPiasters,
    shippingPiasters: order.shippingPiasters,
    totalPiasters: order.totalPiasters,
    placedAt: order.placedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      productSlug: item.productSlug,
      sku: item.sku,
      size: item.size,
      colorName: item.colorName,
      colorHex: item.colorHex,
      imageUrl: item.imageUrl,
      unitPricePiasters: item.unitPricePiasters,
      quantity: item.quantity,
      lineTotalPiasters: item.lineTotalPiasters,
    })),
    payment: {
      id: order.payment.id,
      method: order.payment.method,
      status: order.payment.status,
      amountPiasters: order.payment.amountPiasters,
      proofImagePublicId: order.payment.proofImagePublicId,
      proofSubmittedAt: order.payment.proofSubmittedAt,
      instaPayReference: order.payment.instaPayReference,
      confirmationNote: order.payment.confirmationNote,
      confirmedAt: order.payment.confirmedAt,
    },
    statusEvents: order.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      note: event.note,
      createdAt: event.createdAt,
    })),
  };
}

@Injectable()
export class PrismaOrdersRepository implements OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCustomerOrder(userId: string, orderNumber: string): Promise<OrderRecord | null> {
    return this.findShopperOrder({ userId }, orderNumber);
  }

  async findShopperOrder(owner: ShopperOwner, orderNumber: string): Promise<OrderRecord | null> {
    const order = await this.prisma.order.findFirst({
      where: { ...this.ownerWhere(owner), orderNumber },
      include: orderInclude,
    });
    return order ? mapOrder(order) : null;
  }

  async listCustomer(input: Parameters<OrdersRepository['listCustomer']>[0]) {
    const where: Prisma.OrderWhereInput = {
      userId: input.userId,
      ...(input.status ? { status: input.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        select: customerOrderSummarySelect,
        orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map(mapOrderSummary), total };
  }

  async findAdminOrder(id: string): Promise<OrderRecord | null> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    return order ? mapOrder(order) : null;
  }

  async submitInstaPayProof(
    input: Parameters<OrdersRepository['submitInstaPayProof']>[0],
  ): Promise<'conflict' | 'not_found' | OrderRecord> {
    const result = await this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { ...this.ownerWhere(input.owner), orderNumber: input.orderNumber },
        include: { payment: true },
      });
      if (!order) return 'not_found' as const;
      if (
        order.paymentMethod !== 'INSTAPAY' ||
        order.status !== 'WAITING_FOR_PAYMENT' ||
        order.paymentStatus !== 'WAITING_FOR_PAYMENT' ||
        !order.payment ||
        order.payment.proofSubmittedAt
      ) {
        return 'conflict' as const;
      }

      const updated = await transaction.payment.updateMany({
        where: { orderId: order.id, proofSubmittedAt: null },
        data: {
          proofImagePublicId: input.proofImagePublicId,
          proofSubmittedAt: input.submittedAt,
        },
      });
      if (updated.count !== 1) return 'conflict' as const;

      await transaction.orderStatusEvent.create({
        data: {
          orderId: order.id,
          actorId: input.owner.userId ?? null,
          fromStatus: 'WAITING_FOR_PAYMENT',
          toStatus: 'WAITING_FOR_PAYMENT',
          note: 'Customer submitted an InstaPay transfer receipt.',
        },
      });
      return order.id;
    });
    if (result === 'not_found' || result === 'conflict') return result;
    return (await this.findShopperOrder(input.owner, input.orderNumber)) ?? 'not_found';
  }

  async listAdmin(input: Parameters<OrdersRepository['listAdmin']>[0]) {
    const where: Prisma.OrderWhereInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {}),
      ...(input.search
        ? {
            OR: [
              { orderNumber: { contains: input.search, mode: 'insensitive' } },
              { customerEmail: { contains: input.search, mode: 'insensitive' } },
              { customerPhone: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: items.map(mapOrder), total };
  }

  private ownerWhere(owner: ShopperOwner): { userId: string } | { guestTokenHash: string } {
    if (owner.userId) return { userId: owner.userId };
    if (owner.guestTokenHash) return { guestTokenHash: owner.guestTokenHash };
    throw new Error('An order owner is required.');
  }

  async transition(
    input: Parameters<OrdersRepository['transition']>[0],
  ): Promise<'conflict' | 'not_found' | OrderRecord> {
    try {
      const result = await this.prisma.$transaction(
        async (transaction) => {
          const order = await transaction.order.findUnique({
            where: { id: input.orderId },
            include: { items: true },
          });
          if (!order) return 'not_found' as const;
          if (order.status !== input.expectedStatus) return 'conflict' as const;

          const paymentStatus = this.paymentStatusForTransition(
            input.status,
            order.paymentMethod,
            order.paymentStatus,
          );
          const updated = await transaction.order.updateMany({
            where: { id: order.id, status: input.expectedStatus },
            data: { status: input.status, paymentStatus },
          });
          if (updated.count !== 1) return 'conflict' as const;

          const shouldRestock = input.status === 'CANCELLED' || input.restockItems;
          if (shouldRestock) {
            for (const item of order.items) {
              if (!item.variantId) continue;
              const variant = await transaction.productVariant.update({
                where: { id: item.variantId },
                data: { stockQuantity: { increment: item.quantity } },
                select: { stockQuantity: true },
              });
              await transaction.inventoryMovement.create({
                data: {
                  variantId: item.variantId,
                  actorId: input.actorId,
                  type: input.status === 'CANCELLED' ? 'RELEASE' : 'RETURN',
                  quantityDelta: item.quantity,
                  quantityAfter: variant.stockQuantity,
                  reason:
                    input.note ??
                    (input.status === 'CANCELLED'
                      ? `Stock released for cancelled order ${order.orderNumber}.`
                      : `Stock returned for refunded order ${order.orderNumber}.`),
                  referenceType: 'ORDER',
                  referenceId: order.id,
                },
              });
            }
          }

          await transaction.payment.update({
            where: { orderId: order.id },
            data: { status: paymentStatus },
          });
          await transaction.orderStatusEvent.create({
            data: {
              orderId: order.id,
              actorId: input.actorId,
              fromStatus: order.status,
              toStatus: input.status,
              note: input.note,
            },
          });
          return order.id;
        },
        { isolationLevel: 'Serializable' },
      );
      if (result === 'not_found' || result === 'conflict') return result;
      return (await this.findAdminOrder(result)) ?? 'not_found';
    } catch (error) {
      if (this.isTransactionConflict(error)) return 'conflict';
      throw error;
    }
  }

  async confirmInstaPay(
    input: Parameters<OrdersRepository['confirmInstaPay']>[0],
  ): Promise<'conflict' | 'not_found' | OrderRecord> {
    try {
      const result = await this.prisma.$transaction(
        async (transaction) => {
          const order = await transaction.order.findUnique({
            where: { id: input.orderId },
            include: { payment: true },
          });
          if (!order) return 'not_found' as const;
          if (
            order.paymentMethod !== 'INSTAPAY' ||
            order.status !== 'WAITING_FOR_PAYMENT' ||
            order.paymentStatus !== 'WAITING_FOR_PAYMENT' ||
            !order.payment?.proofSubmittedAt
          ) {
            return 'conflict' as const;
          }
          const updated = await transaction.order.updateMany({
            where: {
              id: order.id,
              status: 'WAITING_FOR_PAYMENT',
              paymentStatus: 'WAITING_FOR_PAYMENT',
            },
            data: { status: 'PAID', paymentStatus: 'PAID' },
          });
          if (updated.count !== 1) return 'conflict' as const;
          await transaction.payment.update({
            where: { orderId: order.id },
            data: {
              status: 'PAID',
              instaPayReference: input.reference,
              confirmationNote: input.note,
              confirmedById: input.actorId,
              confirmedAt: new Date(),
            },
          });
          await transaction.orderStatusEvent.create({
            data: {
              orderId: order.id,
              actorId: input.actorId,
              fromStatus: 'WAITING_FOR_PAYMENT',
              toStatus: 'PAID',
              note: input.note ?? 'InstaPay payment confirmed manually.',
            },
          });
          return order.id;
        },
        { isolationLevel: 'Serializable' },
      );
      if (result === 'not_found' || result === 'conflict') return result;
      return (await this.findAdminOrder(result)) ?? 'not_found';
    } catch (error) {
      if (this.isTransactionConflict(error)) return 'conflict';
      throw error;
    }
  }

  private paymentStatusForTransition(
    status: OrderStatus,
    method: 'CASH_ON_DELIVERY' | 'INSTAPAY',
    current: PaymentStatus,
  ): PaymentStatus {
    if (status === 'CANCELLED') return current === 'PAID' ? 'REFUNDED' : 'CANCELLED';
    if (status === 'REFUNDED') return 'REFUNDED';
    if (status === 'DELIVERED' && method === 'CASH_ON_DELIVERY') return 'PAID';
    return current;
  }

  private isTransactionConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2034'
    );
  }
}
