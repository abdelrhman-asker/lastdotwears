import type {
  InventoryItemRecord,
  InventoryMovementRecord,
  InventoryMovementType,
} from './inventory.interface.js';

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface InventoryRepository {
  list(query: {
    page: number;
    limit: number;
    search?: string;
    lowStock?: boolean;
  }): Promise<{ items: InventoryItemRecord[]; total: number }>;
  movements(variantId: string, limit: number): Promise<InventoryMovementRecord[] | null>;
  adjust(input: {
    variantId: string;
    actorId: string;
    quantityDelta: number;
    type: InventoryMovementType;
    reason: string;
  }): Promise<
    | { kind: 'ok'; item: InventoryItemRecord }
    | { kind: 'not_found' }
    | { kind: 'insufficient' }
    | { kind: 'conflict' }
  >;
}
