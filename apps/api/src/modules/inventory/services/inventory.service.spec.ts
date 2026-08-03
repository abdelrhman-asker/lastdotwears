import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { InventoryRepository } from '../interfaces/inventory-repository.interface.js';
import { InventoryService } from './inventory.service.js';

const actor: AuthenticatedUser = {
  id: 'f8da524c-4d39-4712-9945-895eccde0d21',
  sessionId: '264af772-71bf-4af5-9038-c996be72dd9b',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  isEmailVerified: true,
};

describe('InventoryService', () => {
  it('rejects negative restock movements before repository access', async () => {
    let called = false;
    const repository = {
      adjust: () => {
        called = true;
        return Promise.resolve({ kind: 'conflict' as const });
      },
    } as unknown as InventoryRepository;
    const service = new InventoryService(repository);

    await expect(
      service.adjust(actor, 'd30e98d5-2e49-48ed-a9a3-2b5ef01f27a4', {
        quantityDelta: -2,
        type: 'RESTOCK',
        reason: 'Invalid restock',
      }),
    ).rejects.toThrow('Restock quantity must be positive.');
    expect(called).toBe(false);
  });

  it('reports concurrent stock changes as a conflict', async () => {
    const repository = {
      adjust: () => Promise.resolve({ kind: 'conflict' as const }),
    } as unknown as InventoryRepository;
    const service = new InventoryService(repository);

    await expect(
      service.adjust(actor, 'd30e98d5-2e49-48ed-a9a3-2b5ef01f27a4', {
        quantityDelta: 2,
        reason: 'Cycle count',
      }),
    ).rejects.toThrow('Inventory changed concurrently.');
  });
});
