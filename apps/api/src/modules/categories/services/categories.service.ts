import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createSlug } from '../../../common/utils/catalog-normalization.util.js';
import { hasPrismaCode } from '../../../common/utils/prisma-error.util.js';
import type {
  CreateCategoryDto,
  ListCategoriesQueryDto,
  PaginatedCategoriesResponseDto,
  UpdateCategoryDto,
} from '../dto/category.dto.js';
import { CategoryResponseDto } from '../dto/category.dto.js';
import {
  CATEGORIES_REPOSITORY,
  type CategoriesRepository,
} from '../interfaces/categories-repository.interface.js';

@Injectable()
export class CategoriesService {
  constructor(@Inject(CATEGORIES_REPOSITORY) private readonly repository: CategoriesRepository) {}

  async listPublic(): Promise<CategoryResponseDto[]> {
    return (await this.repository.listPublic()).map((category) =>
      CategoryResponseDto.from(category),
    );
  }

  async getPublic(slug: string): Promise<CategoryResponseDto> {
    const category = await this.repository.findPublicBySlug(slug);
    if (!category) throw new NotFoundException('Category not found.');
    return CategoryResponseDto.from(category);
  }

  async listAdmin(query: ListCategoriesQueryDto): Promise<PaginatedCategoriesResponseDto> {
    const result = await this.repository.listAdmin({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    });
    return {
      items: result.items.map((category) => CategoryResponseDto.from(category)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async getAdmin(id: string): Promise<CategoryResponseDto> {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found.');
    return CategoryResponseDto.from(category);
  }

  async create(input: CreateCategoryDto): Promise<CategoryResponseDto> {
    await this.assertValidParent(null, input.parentId ?? null);
    const slug = input.slug ?? createSlug(input.name);
    if (!slug) throw new BadRequestException('Provide an English slug for this category name.');
    try {
      return CategoryResponseDto.from(
        await this.repository.create({
          name: input.name,
          slug,
          description: input.description || null,
          parentId: input.parentId ?? null,
          position: input.position ?? 0,
          isActive: input.isActive ?? true,
        }),
      );
    } catch (error) {
      if (hasPrismaCode(error, 'P2002'))
        throw new ConflictException('Category slug already exists.');
      throw error;
    }
  }

  async update(id: string, input: UpdateCategoryDto): Promise<CategoryResponseDto> {
    await this.getAdmin(id);
    if (input.parentId !== undefined) await this.assertValidParent(id, input.parentId);
    const slug = input.slug;
    try {
      const category = await this.repository.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      });
      if (!category) throw new NotFoundException('Category not found.');
      return CategoryResponseDto.from(category);
    } catch (error) {
      if (hasPrismaCode(error, 'P2002'))
        throw new ConflictException('Category slug already exists.');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    await this.getAdmin(id);
    const usage = await this.repository.usage(id);
    if (usage.children > 0 || usage.products > 0) {
      throw new ConflictException('Move this category’s children and products before deleting it.');
    }
    if (!(await this.repository.softDelete(id))) throw new NotFoundException('Category not found.');
  }

  private async assertValidParent(
    categoryId: string | null,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    if (categoryId === parentId)
      throw new BadRequestException('A category cannot be its own parent.');
    let currentId: string | null = parentId;
    for (let depth = 0; currentId && depth < 100; depth += 1) {
      if (currentId === categoryId) {
        throw new BadRequestException('Category hierarchy cannot contain a cycle.');
      }
      const parent = await this.repository.findById(currentId);
      if (!parent) throw new BadRequestException('Parent category does not exist.');
      currentId = parent.parentId;
    }
    if (currentId) throw new BadRequestException('Category hierarchy is too deep.');
  }
}
