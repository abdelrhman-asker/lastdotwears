export interface BrandRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
}

export interface BrandListQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}
