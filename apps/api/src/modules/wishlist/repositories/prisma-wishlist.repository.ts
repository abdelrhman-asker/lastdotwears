import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { WishlistRepository } from '../interfaces/wishlist-repository.interface.js';
import type { WishlistProductRecord, WishlistRecord } from '../interfaces/wishlist.interface.js';

const productInclude = {
  brand: { select: { name: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { position: 'asc' as const }],
    take: 1,
    select: { secureUrl: true, altText: true },
  },
  variants: {
    where: { isActive: true, deletedAt: null },
    select: { stockQuantity: true },
  },
} satisfies Prisma.ProductInclude;

const wishlistInclude = {
  items: {
    orderBy: { createdAt: 'desc' as const },
    include: { product: { include: productInclude } },
  },
} satisfies Prisma.WishlistInclude;

type ProductEntity = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type WishlistEntity = Prisma.WishlistGetPayload<{ include: typeof wishlistInclude }>;

function mapProduct(product: ProductEntity): WishlistProductRecord {
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
    stockQuantity: product.variants.reduce((total, variant) => total + variant.stockQuantity, 0),
  };
}

function mapWishlist(wishlist: WishlistEntity): WishlistRecord {
  return {
    id: wishlist.id,
    updatedAt: wishlist.updatedAt,
    items: wishlist.items.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      product: mapProduct(item.product),
    })),
  };
}

@Injectable()
export class PrismaWishlistRepository implements WishlistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwner(owner: ShopperOwner): Promise<WishlistRecord | null> {
    const where = this.ownerWhere(owner);
    if (!where) return null;
    const wishlist = await this.prisma.wishlist.findFirst({ where, include: wishlistInclude });
    return wishlist ? mapWishlist(wishlist) : null;
  }

  async findProduct(productId: string): Promise<WishlistProductRecord | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });
    return product ? mapProduct(product) : null;
  }

  async addItem(owner: ShopperOwner, productId: string): Promise<WishlistRecord> {
    await this.prisma.$transaction(async (transaction) => {
      const wishlistId = await this.ensureWishlist(transaction, owner);
      await transaction.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId, productId } },
        create: { wishlistId, productId },
        update: {},
      });
      await transaction.wishlist.update({
        where: { id: wishlistId },
        data: { updatedAt: new Date() },
      });
    });
    const wishlist = await this.findByOwner(owner);
    if (!wishlist) throw new Error('Wishlist disappeared after an item update.');
    return wishlist;
  }

  async removeItem(owner: ShopperOwner, productId: string): Promise<WishlistRecord | null> {
    const wishlist = await this.findWishlistIdentity(owner);
    if (!wishlist) return null;
    await this.prisma.$transaction([
      this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } }),
      this.prisma.wishlist.update({
        where: { id: wishlist.id },
        data: { updatedAt: new Date() },
      }),
    ]);
    return this.findByOwner(owner);
  }

  async mergeGuestIntoUser(userId: string, guestTokenHash: string): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const guest = await transaction.wishlist.findFirst({
          where: { guestTokenHash, expiresAt: { gt: new Date() } },
          include: { items: { select: { productId: true } } },
        });
        if (!guest) return;
        const userWishlist = await transaction.wishlist.upsert({
          where: { userId },
          create: { userId },
          update: {},
          select: { id: true },
        });
        await transaction.wishlistItem.createMany({
          data: guest.items.map((item) => ({
            wishlistId: userWishlist.id,
            productId: item.productId,
          })),
          skipDuplicates: true,
        });
        await transaction.wishlist.delete({ where: { id: guest.id } });
        await transaction.wishlist.update({
          where: { id: userWishlist.id },
          data: { updatedAt: new Date() },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private ownerWhere(owner: ShopperOwner): Prisma.WishlistWhereInput | null {
    if (owner.userId) return { userId: owner.userId };
    if (owner.guestTokenHash) {
      return { guestTokenHash: owner.guestTokenHash, expiresAt: { gt: new Date() } };
    }
    return null;
  }

  private async findWishlistIdentity(owner: ShopperOwner): Promise<{ id: string } | null> {
    const where = this.ownerWhere(owner);
    return where ? this.prisma.wishlist.findFirst({ where, select: { id: true } }) : null;
  }

  private async ensureWishlist(
    transaction: Prisma.TransactionClient,
    owner: ShopperOwner,
  ): Promise<string> {
    if (owner.userId) {
      return (
        await transaction.wishlist.upsert({
          where: { userId: owner.userId },
          create: { userId: owner.userId },
          update: {},
          select: { id: true },
        })
      ).id;
    }
    if (!owner.guestTokenHash || !owner.guestExpiresAt) {
      throw new Error('A wishlist owner is required.');
    }
    return (
      await transaction.wishlist.upsert({
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
