export type InventoryMovementType =
  'INITIAL' | 'RESTOCK' | 'ADJUSTMENT' | 'SALE' | 'RETURN' | 'RESERVATION' | 'RELEASE';

export interface InventoryItemRecord {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  size: string;
  colorName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  updatedAt: Date;
}

export interface InventoryMovementRecord {
  id: string;
  variantId: string;
  actorId: string | null;
  type: InventoryMovementType;
  quantityDelta: number;
  quantityAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
}
