export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  productCount: number;
}

export interface CategoryListQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}
