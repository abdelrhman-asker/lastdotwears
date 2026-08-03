import type { BrandListQuery, BrandRecord } from './brand.interface.js';

export const BRANDS_REPOSITORY = Symbol('BRANDS_REPOSITORY');

export interface BrandWriteInput {
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  isActive: boolean;
}

export interface BrandsRepository {
  listPublic(): Promise<BrandRecord[]>;
  listAdmin(query: BrandListQuery): Promise<{ items: BrandRecord[]; total: number }>;
  findById(id: string): Promise<BrandRecord | null>;
  findPublicBySlug(slug: string): Promise<BrandRecord | null>;
  create(input: BrandWriteInput): Promise<BrandRecord>;
  update(id: string, input: Partial<BrandWriteInput>): Promise<BrandRecord | null>;
  productCount(id: string): Promise<number>;
  softDelete(id: string): Promise<boolean>;
}
