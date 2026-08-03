import { Injectable } from '@nestjs/common';

import type { Brand as PrismaBrand } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { BrandListQuery, BrandRecord } from '../interfaces/brand.interface.js';
import type {
  BrandWriteInput,
  BrandsRepository,
} from '../interfaces/brands-repository.interface.js';

type BrandWithCount = PrismaBrand & { _count: { products: number } };
const includeCount = { _count: { select: { products: { where: { deletedAt: null } } } } } as const;
const includePublicCount = {
  _count: { select: { products: { where: { deletedAt: null, status: 'ACTIVE' as const } } } },
} as const;

function mapBrand(brand: BrandWithCount): BrandRecord {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    websiteUrl: brand.websiteUrl,
    isActive: brand.isActive,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
    productCount: brand._count.products,
  };
}

@Injectable()
export class PrismaBrandsRepository implements BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<BrandRecord[]> {
    const brands = await this.prisma.brand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      include: includePublicCount,
    });
    return brands.map(mapBrand);
  }

  async listAdmin(query: BrandListQuery): Promise<{ items: BrandRecord[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { slug: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: includeCount,
      }),
      this.prisma.brand.count({ where }),
    ]);
    return { items: items.map(mapBrand), total };
  }

  async findById(id: string): Promise<BrandRecord | null> {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
      include: includeCount,
    });
    return brand ? mapBrand(brand) : null;
  }

  async findPublicBySlug(slug: string): Promise<BrandRecord | null> {
    const brand = await this.prisma.brand.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: includePublicCount,
    });
    return brand ? mapBrand(brand) : null;
  }

  async create(input: BrandWriteInput): Promise<BrandRecord> {
    return mapBrand(await this.prisma.brand.create({ data: input, include: includeCount }));
  }

  async update(id: string, input: Partial<BrandWriteInput>): Promise<BrandRecord | null> {
    const result = await this.prisma.brand.updateMany({
      where: { id, deletedAt: null },
      data: input,
    });
    return result.count === 1 ? this.findById(id) : null;
  }

  productCount(id: string): Promise<number> {
    return this.prisma.product.count({ where: { brandId: id, deletedAt: null } });
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.prisma.brand.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return result.count === 1;
  }
}
