import { Injectable } from '@nestjs/common';

import type {
  Prisma,
  ProductImage as PrismaProductImage,
  ProductVariant as PrismaProductVariant,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type {
  ImageCreateInput,
  ProductCreateInput,
  ProductsRepository,
  ProductUpdateInput,
  VariantConflicts,
  VariantIdentity,
  VariantWriteInput,
} from '../interfaces/products-repository.interface.js';
import type {
  ProductImageRecord,
  ProductListQuery,
  ProductRecord,
  ProductVariantRecord,
} from '../interfaces/product.interface.js';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  variants: {
    where: { deletedAt: null },
    orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  images: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] },
} satisfies Prisma.ProductInclude;

type ProductEntity = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function mapVariant(variant: PrismaProductVariant): ProductVariantRecord {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    size: variant.size,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    priceOverridePiasters: variant.priceOverridePiasters,
    stockQuantity: variant.stockQuantity,
    lowStockThreshold: variant.lowStockThreshold,
    isActive: variant.isActive,
    position: variant.position,
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}

function toVariantIdentity(variant: PrismaProductVariant): VariantIdentity {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    size: variant.size,
    colorName: variant.colorName,
    isDeleted: variant.deletedAt !== null,
  };
}

function mapImage(image: PrismaProductImage): ProductImageRecord {
  return {
    id: image.id,
    productId: image.productId,
    publicId: image.publicId,
    secureUrl: image.secureUrl,
    width: image.width,
    height: image.height,
    format: image.format,
    bytes: image.bytes,
    altText: image.altText,
    position: image.position,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

function mapProduct(product: ProductEntity, publicOnly = false): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    pricePiasters: product.pricePiasters,
    salePricePiasters: product.salePricePiasters,
    categoryId: product.categoryId,
    brandId: product.brandId,
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category,
    brand: product.brand,
    variants: product.variants.filter((variant) => !publicOnly || variant.isActive).map(mapVariant),
    images: product.images.map(mapImage),
  };
}

function orderBy(sort: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }];
    case 'price-asc':
      return [{ sortPricePiasters: 'asc' }, { createdAt: 'desc' }];
    case 'price-desc':
      return [{ sortPricePiasters: 'desc' }, { createdAt: 'desc' }];
    case 'name-asc':
      return [{ name: 'asc' }];
    case 'newest':
      return [{ createdAt: 'desc' }];
  }
}

function listWhere(query: ProductListQuery, isPublic: boolean): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];
  if (isPublic) {
    and.push(
      { category: { isActive: true, deletedAt: null } },
      { brand: { isActive: true, deletedAt: null } },
      { variants: { some: { isActive: true, deletedAt: null } } },
    );
  }
  if (query.category) and.push({ category: { slug: query.category } });
  if (query.brand) and.push({ brand: { slug: query.brand } });
  if (query.size) {
    and.push({
      variants: {
        some: {
          size: { equals: query.size, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
      },
    });
  }
  if (query.color) {
    and.push({
      variants: {
        some: {
          colorName: { equals: query.color, mode: 'insensitive' },
          isActive: true,
          deletedAt: null,
        },
      },
    });
  }
  if (query.minPrice !== undefined) {
    and.push({
      OR: [
        { salePricePiasters: { gte: query.minPrice } },
        { salePricePiasters: null, pricePiasters: { gte: query.minPrice } },
      ],
    });
  }
  if (query.maxPrice !== undefined) {
    and.push({
      OR: [
        { salePricePiasters: { lte: query.maxPrice } },
        { salePricePiasters: null, pricePiasters: { lte: query.maxPrice } },
      ],
    });
  }

  return {
    deletedAt: null,
    ...(isPublic ? { status: 'ACTIVE' } : query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { variants: { some: { sku: { contains: query.search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
    ...(query.featured === undefined ? {} : { isFeatured: query.featured }),
    ...(query.newArrival === undefined ? {} : { isNewArrival: query.newArrival }),
    ...(and.length ? { AND: and } : {}),
  };
}

@Injectable()
export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(query: ProductListQuery): Promise<{ items: ProductRecord[]; total: number }> {
    return this.list(query, true);
  }

  listAdmin(query: ProductListQuery): Promise<{ items: ProductRecord[]; total: number }> {
    return this.list(query, false);
  }

  private async list(
    query: ProductListQuery,
    isPublic: boolean,
  ): Promise<{ items: ProductRecord[]; total: number }> {
    const where = listWhere(query, isPublic);
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: orderBy(query.sort),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: productInclude,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items: products.map((product) => mapProduct(product, isPublic)), total };
  }

  async findPublicBySlug(slug: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        status: 'ACTIVE',
        deletedAt: null,
        category: { isActive: true, deletedAt: null },
        brand: { isActive: true, deletedAt: null },
        variants: { some: { isActive: true, deletedAt: null } },
      },
      include: productInclude,
    });
    return product ? mapProduct(product, true) : null;
  }

  async findById(id: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: productInclude,
    });
    return product ? mapProduct(product) : null;
  }

  async catalogReferencesExist(categoryId: string, brandId: string): Promise<boolean> {
    const [categories, brands] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { id: categoryId, deletedAt: null } }),
      this.prisma.brand.count({ where: { id: brandId, deletedAt: null } }),
    ]);
    return categories === 1 && brands === 1;
  }

  async create(input: ProductCreateInput): Promise<ProductRecord> {
    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        pricePiasters: input.pricePiasters,
        salePricePiasters: input.salePricePiasters,
        sortPricePiasters: input.salePricePiasters ?? input.pricePiasters,
        categoryId: input.categoryId,
        brandId: input.brandId,
        status: input.status,
        isFeatured: input.isFeatured,
        isNewArrival: input.isNewArrival,
        variants: {
          create: input.variants.map((variant) => ({
            ...variant,
            ...(variant.stockQuantity > 0
              ? {
                  inventoryMovements: {
                    create: {
                      actorId: input.actorId,
                      type: 'INITIAL',
                      quantityDelta: variant.stockQuantity,
                      quantityAfter: variant.stockQuantity,
                      reason: 'Initial product inventory',
                    },
                  },
                }
              : {}),
          })),
        },
      },
      include: productInclude,
    });
    return mapProduct(product);
  }

  async update(id: string, input: ProductUpdateInput): Promise<ProductRecord | null> {
    const result = await this.prisma.product.updateMany({
      where: { id, deletedAt: null },
      data: input,
    });
    return result.count === 1 ? this.findById(id) : null;
  }

  async softDelete(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const now = new Date();
      const result = await transaction.product.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: now, status: 'ARCHIVED', isFeatured: false, isNewArrival: false },
      });
      if (result.count !== 1) return false;
      await transaction.productVariant.updateMany({
        where: { productId: id, deletedAt: null },
        data: { isActive: false },
      });
      return true;
    });
  }

  async createVariant(
    productId: string,
    input: VariantWriteInput,
    actorId: string,
  ): Promise<ProductVariantRecord> {
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        ...input,
        ...(input.stockQuantity > 0
          ? {
              inventoryMovements: {
                create: {
                  actorId,
                  type: 'INITIAL',
                  quantityDelta: input.stockQuantity,
                  quantityAfter: input.stockQuantity,
                  reason: 'Initial variant inventory',
                },
              },
            }
          : {}),
      },
    });
    return mapVariant(variant);
  }

  async findVariant(productId: string, variantId: string): Promise<ProductVariantRecord | null> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, deletedAt: null },
    });
    return variant ? mapVariant(variant) : null;
  }

  async findVariantConflicts(
    productId: string,
    sku: string,
    combinationKey: string,
  ): Promise<VariantConflicts> {
    const bySku = await this.prisma.productVariant.findUnique({ where: { sku } });
    const byCombination = await this.prisma.productVariant.findUnique({
      where: { productId_combinationKey: { productId, combinationKey } },
    });
    return {
      bySku: bySku ? toVariantIdentity(bySku) : null,
      byCombination: byCombination ? toVariantIdentity(byCombination) : null,
    };
  }

  async restoreVariant(
    productId: string,
    variantId: string,
    input: VariantWriteInput,
    actorId: string,
  ): Promise<ProductVariantRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.productVariant.findFirst({
        where: { id: variantId, productId, deletedAt: { not: null } },
      });
      if (!existing) return null;
      const variant = await transaction.productVariant.update({
        where: { id: variantId },
        data: { ...input, deletedAt: null },
      });
      const quantityDelta = input.stockQuantity - existing.stockQuantity;
      if (quantityDelta !== 0) {
        await transaction.inventoryMovement.create({
          data: {
            variantId,
            actorId,
            type: 'ADJUSTMENT',
            quantityDelta,
            quantityAfter: input.stockQuantity,
            reason: 'Restored a previously removed variant',
          },
        });
      }
      return mapVariant(variant);
    });
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: Partial<Omit<VariantWriteInput, 'stockQuantity'>>,
  ): Promise<ProductVariantRecord | null> {
    const result = await this.prisma.productVariant.updateMany({
      where: { id: variantId, productId, deletedAt: null },
      data: input,
    });
    return result.count === 1 ? this.findVariant(productId, variantId) : null;
  }

  activeVariantCount(productId: string): Promise<number> {
    return this.prisma.productVariant.count({
      where: { productId, isActive: true, deletedAt: null },
    });
  }

  async deactivateVariant(productId: string, variantId: string): Promise<boolean> {
    const result = await this.prisma.productVariant.updateMany({
      where: { id: variantId, productId, deletedAt: null },
      data: { isActive: false, deletedAt: new Date() },
    });
    return result.count === 1;
  }

  async createImage(productId: string, input: ImageCreateInput): Promise<ProductImageRecord> {
    const image = await this.prisma.$transaction(async (transaction) => {
      const count = await transaction.productImage.count({ where: { productId } });
      const primary = input.isPrimary || count === 0;
      if (primary) {
        await transaction.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      }
      return transaction.productImage.create({ data: { productId, ...input, isPrimary: primary } });
    });
    return mapImage(image);
  }

  async findImage(productId: string, imageId: string): Promise<ProductImageRecord | null> {
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    return image ? mapImage(image) : null;
  }

  async updateImage(
    productId: string,
    imageId: string,
    input: { altText?: string; position?: number; isPrimary?: boolean },
  ): Promise<ProductImageRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const data = { ...input };
      const existing = await transaction.productImage.findFirst({
        where: { id: imageId, productId },
      });
      if (!existing) return null;
      if (input.isPrimary) {
        await transaction.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        });
      } else if (input.isPrimary === false && existing.isPrimary) {
        const replacement = await transaction.productImage.findFirst({
          where: { productId, id: { not: imageId } },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });
        if (!replacement) {
          delete data.isPrimary;
        } else {
          await transaction.productImage.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
      const image = await transaction.productImage.update({ where: { id: imageId }, data });
      return mapImage(image);
    });
  }

  async deleteImage(productId: string, imageId: string): Promise<ProductImageRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.productImage.findFirst({
        where: { id: imageId, productId },
      });
      if (!existing) return null;
      await transaction.productImage.delete({ where: { id: imageId } });
      if (existing.isPrimary) {
        const replacement = await transaction.productImage.findFirst({
          where: { productId },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });
        if (replacement) {
          await transaction.productImage.update({
            where: { id: replacement.id },
            data: { isPrimary: true },
          });
        }
      }
      return mapImage(existing);
    });
  }
}
