import type { CategoryListQuery, CategoryRecord } from './category.interface.js';

export const CATEGORIES_REPOSITORY = Symbol('CATEGORIES_REPOSITORY');

export interface CategoryWriteInput {
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
}

export interface CategoriesRepository {
  listPublic(): Promise<CategoryRecord[]>;
  listAdmin(query: CategoryListQuery): Promise<{ items: CategoryRecord[]; total: number }>;
  findById(id: string): Promise<CategoryRecord | null>;
  findPublicBySlug(slug: string): Promise<CategoryRecord | null>;
  create(input: CategoryWriteInput): Promise<CategoryRecord>;
  update(id: string, input: Partial<CategoryWriteInput>): Promise<CategoryRecord | null>;
  usage(id: string): Promise<{ children: number; products: number }>;
  softDelete(id: string): Promise<boolean>;
}
