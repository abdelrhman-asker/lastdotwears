import { randomBytes, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Coupon, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { mapOrder } from '../../orders/repositories/prisma-orders.repository.js';
import type { CheckoutRepository } from '../interfaces/checkout-repository.interface.js';
import type {
  CheckoutFailure,
  CheckoutQuoteRecord,
  CheckoutQuoteResult,
  PlaceOrderInput,
  PlaceOrderResult,
} from '../interfaces/checkout.interface.js';
import { calculateDiscount, effectiveUnitPrice } from '../utils/checkout-pricing.util.js';

const checkoutCartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
                take: 1,
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

const placedOrderInclude = {
  items: { orderBy: { createdAt: 'asc' as const } },
  payment: true,
  statusEvents: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;

type CheckoutCart = Prisma.CartGetPayload<{ include: typeof checkoutCartInclude }>;
type Transaction = Prisma.TransactionClient;

@Injectable()
export class PrismaCheckoutRepository implements CheckoutRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  quote(
    userId: string,
    governorateCode: string,
    couponCode: string | null,
  ): Promise<CheckoutQuoteResult> {
    return this.prisma.$transaction(async (transaction) => {
      const cart = await transaction.cart.findUnique({
        where: { userId },
        include: checkoutCartInclude,
      });
      if (!cart?.items.length) return { kind: 'empty_cart' };
      return this.calculate(transaction, userId, cart, governorateCode, couponCode);
    });
  }

  async place(userId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const existing = await this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      include: placedOrderInclude,
    });
    if (existing) return { kind: 'ok', order: mapOrder(existing), idempotentReplay: true };

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (transaction) => this.placeTransaction(transaction, userId, input),
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        if (this.isTransactionConflict(error) && attempt < 2) continue;
        if (this.isUniqueConflict(error)) {
          const replay = await this.prisma.order.findUnique({
            where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
            include: placedOrderInclude,
          });
          if (replay) return { kind: 'ok', order: mapOrder(replay), idempotentReplay: true };
        }
        if (error instanceof CheckoutStockChangedError) {
          return { kind: 'cart_changed', detail: error.message };
        }
        if (error instanceof CheckoutCouponChangedError) {
          return { kind: 'coupon_invalid', detail: error.message };
        }
        if (this.isTransactionConflict(error)) return { kind: 'conflict' };
        throw error;
      }
    }
    return { kind: 'conflict' };
  }

  private async placeTransaction(
    transaction: Transaction,
    userId: string,
    input: PlaceOrderInput,
  ): Promise<PlaceOrderResult> {
    const replay = await transaction.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      include: placedOrderInclude,
    });
    if (replay) return { kind: 'ok', order: mapOrder(replay), idempotentReplay: true };

    const cart = await transaction.cart.findUnique({
      where: { userId },
      include: checkoutCartInclude,
    });
    if (!cart?.items.length) return { kind: 'empty_cart' };
    const calculated = await this.calculate(
      transaction,
      userId,
      cart,
      input.governorateCode,
      input.couponCode,
    );
    if (calculated.kind !== 'ok') return calculated;

    const quote = calculated.quote;
    const orderId = randomUUID();
    // A 48-bit random suffix keeps identifiers short while making collisions
    // negligible even at high order volumes.
    const suffix = randomBytes(6).toString('hex').toUpperCase();
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const prefix = this.config.getOrThrow<string>('ORDER_NUMBER_PREFIX');
    const orderNumber = `${prefix}-${date}-${suffix}`;
    const invoiceNumber = `INV-${date}-${suffix}`;
    const status = input.paymentMethod === 'INSTAPAY' ? 'WAITING_FOR_PAYMENT' : 'PENDING';
    const paymentStatus = input.paymentMethod === 'INSTAPAY' ? 'WAITING_FOR_PAYMENT' : 'PENDING';

    const shippingRate = await transaction.shippingRate.findUniqueOrThrow({
      where: { governorateCode: input.governorateCode },
    });
    const coupon = input.couponCode
      ? await transaction.coupon.findUnique({ where: { code: input.couponCode } })
      : null;

    await transaction.order.create({
      data: {
        id: orderId,
        orderNumber,
        invoiceNumber,
        idempotencyKey: input.idempotencyKey,
        userId,
        couponId: coupon?.id ?? null,
        shippingRateId: shippingRate.id,
        status,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        customerFirstName: input.customerFirstName,
        customerLastName: input.customerLastName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingGovernorateCode: shippingRate.governorateCode,
        shippingGovernorateName: shippingRate.governorateName,
        shippingCity: input.shippingCity,
        shippingAddressLine1: input.shippingAddressLine1,
        shippingAddressLine2: input.shippingAddressLine2,
        shippingPostalCode: input.shippingPostalCode,
        deliveryNotes: input.deliveryNotes,
        couponCode: quote.couponCode,
        subtotalPiasters: quote.subtotalPiasters,
        discountPiasters: quote.discountPiasters,
        shippingPiasters: quote.shippingPiasters,
        totalPiasters: quote.totalPiasters,
        items: {
          create: cart.items.map((item) => {
            const unitPricePiasters = effectiveUnitPrice({
              priceOverridePiasters: item.variant.priceOverridePiasters,
              salePricePiasters: item.variant.product.salePricePiasters,
              pricePiasters: item.variant.product.pricePiasters,
            });
            return {
              productId: item.variant.productId,
              variantId: item.variantId,
              productName: item.variant.product.name,
              productSlug: item.variant.product.slug,
              sku: item.variant.sku,
              size: item.variant.size,
              colorName: item.variant.colorName,
              colorHex: item.variant.colorHex,
              imageUrl: item.variant.product.images[0]?.secureUrl ?? null,
              unitPricePiasters,
              quantity: item.quantity,
              lineTotalPiasters: unitPricePiasters * item.quantity,
            };
          }),
        },
        payment: {
          create: {
            method: input.paymentMethod,
            status: paymentStatus,
            amountPiasters: quote.totalPiasters,
          },
        },
        statusEvents: {
          create: { fromStatus: null, toStatus: status, note: 'Order placed by customer.' },
        },
      },
    });

    for (const item of cart.items) {
      const changed = await transaction.productVariant.updateMany({
        where: {
          id: item.variantId,
          isActive: true,
          deletedAt: null,
          stockQuantity: { gte: item.quantity },
          product: { status: 'ACTIVE', deletedAt: null },
        },
        data: { stockQuantity: { decrement: item.quantity } },
      });
      if (changed.count !== 1) {
        throw new CheckoutStockChangedError('Cart stock changed while the order was being placed.');
      }
      const current = await transaction.productVariant.findUniqueOrThrow({
        where: { id: item.variantId },
        select: { stockQuantity: true },
      });
      await transaction.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          type: 'SALE',
          quantityDelta: -item.quantity,
          quantityAfter: current.stockQuantity,
          reason: `Order ${orderNumber} placed.`,
          referenceType: 'ORDER',
          referenceId: orderId,
        },
      });
    }

    if (coupon && quote.discountPiasters > 0) {
      const incremented = await transaction.coupon.updateMany({
        where: {
          id: coupon.id,
          AND: [
            { timesUsed: coupon.timesUsed },
            ...(coupon.usageLimit === null ? [] : [{ timesUsed: { lt: coupon.usageLimit } }]),
          ],
        },
        data: { timesUsed: { increment: 1 } },
      });
      if (incremented.count !== 1) {
        throw new CheckoutCouponChangedError('Coupon usage limit was reached.');
      }
      await transaction.couponRedemption.create({
        data: { couponId: coupon.id, userId, orderId, discountPiasters: quote.discountPiasters },
      });
    }

    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
    await transaction.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });

    const order = await transaction.order.findUniqueOrThrow({
      where: { id: orderId },
      include: placedOrderInclude,
    });
    return { kind: 'ok', order: mapOrder(order), idempotentReplay: false };
  }

  private async calculate(
    database: Transaction,
    userId: string,
    cart: CheckoutCart,
    governorateCode: string,
    couponCode: string | null,
  ): Promise<CheckoutQuoteResult> {
    const invalidItem = cart.items.find((item) => {
      const variant = item.variant;
      return (
        !variant.isActive ||
        Boolean(variant.deletedAt) ||
        variant.product.status !== 'ACTIVE' ||
        Boolean(variant.product.deletedAt) ||
        variant.stockQuantity < item.quantity
      );
    });
    if (invalidItem) {
      return {
        kind: 'cart_changed',
        detail: 'A cart item is unavailable or has insufficient stock.',
      };
    }
    const shipping = await database.shippingRate.findFirst({
      where: { governorateCode, isActive: true },
    });
    if (!shipping) return { kind: 'shipping_unavailable' };

    const subtotalPiasters = cart.items.reduce(
      (total, item) =>
        total +
        effectiveUnitPrice({
          priceOverridePiasters: item.variant.priceOverridePiasters,
          salePricePiasters: item.variant.product.salePricePiasters,
          pricePiasters: item.variant.product.pricePiasters,
        }) *
          item.quantity,
      0,
    );
    let discountPiasters = 0;
    let appliedCode: string | null = null;
    if (couponCode) {
      const coupon = await database.coupon.findUnique({ where: { code: couponCode } });
      const failure = await this.couponFailure(database, userId, coupon, subtotalPiasters);
      if (failure) return failure;
      if (!coupon) return { kind: 'coupon_invalid', detail: 'Coupon is not valid.' };
      discountPiasters = calculateDiscount(subtotalPiasters, coupon);
      appliedCode = coupon.code;
    }
    const quote: CheckoutQuoteRecord = {
      subtotalPiasters,
      discountPiasters,
      shippingPiasters: shipping.feePiasters,
      totalPiasters: subtotalPiasters - discountPiasters + shipping.feePiasters,
      couponCode: appliedCode,
      shipping: {
        governorateCode: shipping.governorateCode,
        governorateName: shipping.governorateName,
        estimatedMinDays: shipping.estimatedMinDays,
        estimatedMaxDays: shipping.estimatedMaxDays,
      },
    };
    return { kind: 'ok', quote };
  }

  private async couponFailure(
    database: Transaction,
    userId: string,
    coupon: Coupon | null,
    subtotalPiasters: number,
  ): Promise<CheckoutFailure | null> {
    const now = new Date();
    if (!coupon || !coupon.isActive)
      return { kind: 'coupon_invalid', detail: 'Coupon is not valid.' };
    if (coupon.startsAt && coupon.startsAt > now) {
      return { kind: 'coupon_invalid', detail: 'Coupon is not active yet.' };
    }
    if (coupon.endsAt && coupon.endsAt <= now) {
      return { kind: 'coupon_invalid', detail: 'Coupon has expired.' };
    }
    if (coupon.usageLimit !== null && coupon.timesUsed >= coupon.usageLimit) {
      return { kind: 'coupon_invalid', detail: 'Coupon usage limit has been reached.' };
    }
    if (subtotalPiasters < coupon.minimumSubtotalPiasters) {
      return { kind: 'coupon_invalid', detail: 'Cart subtotal does not meet the coupon minimum.' };
    }
    const customerUses = await database.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (customerUses >= coupon.perCustomerLimit) {
      return { kind: 'coupon_invalid', detail: 'Coupon customer usage limit has been reached.' };
    }
    return null;
  }

  private isTransactionConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2034'
    );
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'P2002'
    );
  }
}

class CheckoutStockChangedError extends Error {}
class CheckoutCouponChangedError extends Error {}
