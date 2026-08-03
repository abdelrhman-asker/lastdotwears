import { Injectable } from '@nestjs/common';

import type { Category as PrismaCategory } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type {
  CategoriesRepository,
  CategoryWriteInput,
} from '../interfaces/categories-repository.interface.js';
import type { CategoryListQuery, CategoryRecord } from '../interfaces/category.interface.js';

type CategoryWithCount = PrismaCategory & { _count: { products: number } };

function mapCategory(category: CategoryWithCount): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    position: category.position,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    productCount: category._count.products,
  };
}

const includeCount = { _count: { select: { products: { where: { deletedAt: null } } } } } as const;
const includePublicCount = {
  _count: { select: { products: { where: { deletedAt: null, status: 'ACTIVE' as const } } } },
} as const;

@Injectable()
export class PrismaCategoriesRepository implements CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(): Promise<CategoryRecord[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: includePublicCount,
    });
    return categories.map(mapCategory);
  }

  async listAdmin(query: CategoryListQuery): Promise<{ items: CategoryRecord[]; total: number }> {
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
      this.prisma.category.findMany({
        where,
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: includeCount,
      }),
      this.prisma.category.count({ where }),
    ]);
    return { items: items.map(mapCategory), total };
  }

  async findById(id: string): Promise<CategoryRecord | null> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: includeCount,
    });
    return category ? mapCategory(category) : null;
  }

  async findPublicBySlug(slug: string): Promise<CategoryRecord | null> {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      include: includePublicCount,
    });
    return category ? mapCategory(category) : null;
  }

  async create(input: CategoryWriteInput): Promise<CategoryRecord> {
    const category = await this.prisma.category.create({ data: input, include: includeCount });
    return mapCategory(category);
  }

  async update(id: string, input: Partial<CategoryWriteInput>): Promise<CategoryRecord | null> {
    const result = await this.prisma.category.updateMany({
      where: { id, deletedAt: null },
      data: input,
    });
    return result.count === 1 ? this.findById(id) : null;
  }

  async usage(id: string): Promise<{ children: number; products: number }> {
    const [children, products] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { parentId: id, deletedAt: null } }),
      this.prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    return { children, products };
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.prisma.category.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return result.count === 1;
  }
}
