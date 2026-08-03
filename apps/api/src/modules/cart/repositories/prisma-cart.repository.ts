import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { CartRepository } from '../interfaces/cart-repository.interface.js';
import type {
  CartItemRecord,
  CartProductRecord,
  CartRecord,
  CartVariantRecord,
} from '../interfaces/cart.interface.js';

const productInclude = {
  brand: { select: { name: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
    take: 1,
    select: { secureUrl: true, altText: true },
  },
} satisfies Prisma.ProductInclude;

const variantInclude = {
  product: { include: productInclude },
} satisfies Prisma.ProductVariantInclude;
const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: { variant: { include: variantInclude } },
  },
} satisfies Prisma.CartInclude;

type VariantEntity = Prisma.ProductVariantGetPayload<{ include: typeof variantInclude }>;
type CartEntity = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function mapProduct(product: VariantEntity['product']): CartProductRecord {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    pricePiasters: product.pricePiasters,
    salePricePiasters: product.salePricePiasters,
    status: product.status,
    deletedAt: product.deletedAt,
    brandName: product.brand.name,
    image: product.images[0] ?? null,
  };
}

function mapVariant(variant: VariantEntity): CartVariantRecord {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    size: variant.size,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    priceOverridePiasters: variant.priceOverridePiasters,
    stockQuantity: variant.stockQuantity,
    isActive: variant.isActive,
    deletedAt: variant.deletedAt,
    product: mapProduct(variant.product),
  };
}

function mapCart(cart: CartEntity): CartRecord {
  return {
    id: cart.id,
    updatedAt: cart.updatedAt,
    items: cart.items.map((item): CartItemRecord => ({
      id: item.id,
      quantity: item.quantity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      variant: mapVariant(item.variant),
    })),
  };
}

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(owner: ShopperOwner): Promise<CartRecord | null> {
    const where = this.ownerWhere(owner);
    if (!where) return null;
    const cart = await this.prisma.cart.findFirst({ where, include: cartInclude });
    return cart ? mapCart(cart) : null;
  }

  async findVariant(variantId: string): Promise<CartVariantRecord | null> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: variantInclude,
    });
    return variant ? mapVariant(variant) : null;
  }

  async setItem(owner: ShopperOwner, variantId: string, quantity: number): Promise<CartRecord> {
    await this.prisma.$transaction(async (transaction) => {
      const cartId = await this.ensureCart(transaction, owner);
      await transaction.cartItem.upsert({
        where: { cartId_variantId: { cartId, variantId } },
        create: { cartId, variantId, quantity },
        update: { quantity },
      });
      await transaction.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
    });
    const cart = await this.findByOwner(owner);
    if (!cart) throw new Error('Cart disappeared after an item update.');
    return cart;
  }

  async removeItem(owner: ShopperOwner, variantId: string): Promise<CartRecord | null> {
    const cart = await this.findCartIdentity(owner);
    if (!cart) return null;
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } }),
      this.prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } }),
    ]);
    return this.findByOwner(owner);
  }

  async clear(owner: ShopperOwner): Promise<CartRecord | null> {
    const cart = await this.findCartIdentity(owner);
    if (!cart) return null;
    await this.prisma.$transaction([
      this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      this.prisma.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } }),
    ]);
    return this.findByOwner(owner);
  }

  async mergeGuestIntoUser(userId: string, guestTokenHash: string): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const guest = await transaction.cart.findFirst({
          where: { guestTokenHash, expiresAt: { gt: new Date() } },
          include: { items: true },
        });
        if (!guest) return;
        const userCart = await transaction.cart.upsert({
          where: { userId },
          create: { userId },
          update: {},
          include: { items: true },
        });
        const quantities = new Map(userCart.items.map((item) => [item.variantId, item.quantity]));
        for (const item of guest.items) {
          const quantity = Math.min(99, (quantities.get(item.variantId) ?? 0) + item.quantity);
          await transaction.cartItem.upsert({
            where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
            create: { cartId: userCart.id, variantId: item.variantId, quantity },
            update: { quantity },
          });
        }
        await transaction.cart.delete({ where: { id: guest.id } });
        await transaction.cart.update({
          where: { id: userCart.id },
          data: { updatedAt: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private ownerWhere(owner: ShopperOwner): Prisma.CartWhereInput | null {
    if (owner.userId) return { userId: owner.userId };
    if (owner.guestTokenHash) {
      return { guestTokenHash: owner.guestTokenHash, expiresAt: { gt: new Date() } };
    }
    return null;
  }

  private async findCartIdentity(owner: ShopperOwner): Promise<{ id: string } | null> {
    const where = this.ownerWhere(owner);
    return where ? this.prisma.cart.findFirst({ where, select: { id: true } }) : null;
  }

  private async ensureCart(
    transaction: Prisma.TransactionClient,
    owner: ShopperOwner,
  ): Promise<string> {
    if (owner.userId) {
      return (
        await transaction.cart.upsert({
          where: { userId: owner.userId },
          create: { userId: owner.userId },
          update: {},
          select: { id: true },
        })
      ).id;
    }
    if (!owner.guestTokenHash || !owner.guestExpiresAt) {
      throw new Error('A cart owner is required.');
    }
    return (
      await transaction.cart.upsert({
        where: { guestTokenHash: owner.guestTokenHash },
        create: {
          guestTokenHash: owner.guestTokenHash,
          expiresAt: owner.guestExpiresAt,
        },
        update: { expiresAt: owner.guestExpiresAt },
        select: { id: true },
      })
    ).id;
  }
}
