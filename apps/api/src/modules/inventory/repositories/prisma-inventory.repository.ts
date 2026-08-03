import { Injectable } from '@nestjs/common';

import type {
  InventoryMovement as PrismaInventoryMovement,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { InventoryRepository } from '../interfaces/inventory-repository.interface.js';
import type {
  InventoryItemRecord,
  InventoryMovementRecord,
} from '../interfaces/inventory.interface.js';

type VariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: { product: { select: { id: true; name: true; slug: true } } };
}>;

function mapItem(variant: VariantWithProduct): InventoryItemRecord {
  return {
    variantId: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    productSlug: variant.product.slug,
    sku: variant.sku,
    size: variant.size,
    colorName: variant.colorName,
    stockQuantity: variant.stockQuantity,
    lowStockThreshold: variant.lowStockThreshold,
    isActive: variant.isActive,
    updatedAt: variant.updatedAt,
  };
}

function mapMovement(movement: PrismaInventoryMovement): InventoryMovementRecord {
  return { ...movement };
}

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    page: number;
    limit: number;
    search?: string;
    lowStock?: boolean;
  }): Promise<{ items: InventoryItemRecord[]; total: number }> {
    const lowStock = query.lowStock
      ? { stockQuantity: { lte: this.prisma.productVariant.fields.lowStockThreshold } }
      : {};
    const where: Prisma.ProductVariantWhereInput = {
      deletedAt: null,
      product: { deletedAt: null },
      ...lowStock,
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { product: { name: { contains: query.search, mode: 'insensitive' } } },
              { colorName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.productVariant.findMany({
        where,
        include: { product: { select: { id: true, name: true, slug: true } } },
        orderBy: [{ stockQuantity: 'asc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.productVariant.count({ where }),
    ]);
    return { items: items.map(mapItem), total };
  }

  async movements(variantId: string, limit: number): Promise<InventoryMovementRecord[] | null> {
    const exists = await this.prisma.productVariant.count({
      where: { id: variantId, deletedAt: null },
    });
    if (!exists) return null;
    const movements = await this.prisma.inventoryMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return movements.map(mapMovement);
  }

  async adjust(
    input: Parameters<InventoryRepository['adjust']>[0],
  ): ReturnType<InventoryRepository['adjust']> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const variant = await transaction.productVariant.findFirst({
            where: { id: input.variantId, deletedAt: null, product: { deletedAt: null } },
          });
          if (!variant) return { kind: 'not_found' as const };
          const quantityAfter = variant.stockQuantity + input.quantityDelta;
          if (quantityAfter < 0) return { kind: 'insufficient' as const };

          const updated = await transaction.productVariant.updateMany({
            where: { id: variant.id, stockQuantity: variant.stockQuantity, deletedAt: null },
            data: { stockQuantity: quantityAfter },
          });
          if (updated.count !== 1) return { kind: 'conflict' as const };

          await transaction.inventoryMovement.create({
            data: {
              variantId: variant.id,
              actorId: input.actorId,
              type: input.type,
              quantityDelta: input.quantityDelta,
              quantityAfter,
              reason: input.reason,
            },
          });
          const item = await transaction.productVariant.findUniqueOrThrow({
            where: { id: variant.id },
            include: { product: { select: { id: true, name: true, slug: true } } },
          });
          return { kind: 'ok' as const, item: mapItem(item) };
        },
        { isolationLevel: 'Serializable' },
      );
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'P2034'
      ) {
        return { kind: 'conflict' };
      }
      throw error;
    }
  }
}
