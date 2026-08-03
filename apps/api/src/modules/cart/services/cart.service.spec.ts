import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { CartRepository } from '../interfaces/cart-repository.interface.js';
import type { CartRecord, CartVariantRecord } from '../interfaces/cart.interface.js';
import { CartService } from './cart.service.js';

const variant: CartVariantRecord = {
  id: '35f9e268-ece3-4be4-99bf-bf504c88c74c',
  productId: '0be8a544-e24b-44b2-bb62-a15a943b3248',
  sku: 'SHIRT-BLK-M',
  size: 'M',
  colorName: 'Black',
  colorHex: '#111111',
  priceOverridePiasters: null,
  stockQuantity: 8,
  isActive: true,
  deletedAt: null,
  product: {
    id: '0be8a544-e24b-44b2-bb62-a15a943b3248',
    name: 'Relaxed Shirt',
    slug: 'relaxed-shirt',
    pricePiasters: 150_000,
    salePricePiasters: 120_000,
    status: 'ACTIVE',
    deletedAt: null,
    brandName: 'Cairo Essentials',
    image: null,
  },
};

function cart(quantity = 2, itemVariant = variant): CartRecord {
  const now = new Date('2026-08-02T00:00:00Z');
  return {
    id: 'c866314a-87a9-47d8-8362-3bf7849a61fa',
    updatedAt: now,
    items: [
      {
        id: '22782d7e-fe57-4d07-8141-817d5938dd6e',
        quantity,
        createdAt: now,
        updatedAt: now,
        variant: itemVariant,
      },
    ],
  };
}

describe('CartService', () => {
  it('reprices cart lines from the live sale price', async () => {
    const repository = {
      findByOwner: () => Promise.resolve(cart()),
    } as unknown as CartRepository;
    const response = await new CartService(repository).get({ userId: 'user-id' });

    expect(response).toMatchObject({
      itemCount: 2,
      subtotalPiasters: 240_000,
      hasUnavailableItems: false,
      items: [{ unitPricePiasters: 120_000, lineTotalPiasters: 240_000 }],
    });
  });

  it('flags a stale quantity when stock falls below the cart quantity', async () => {
    const repository = {
      findByOwner: () => Promise.resolve(cart(4, { ...variant, stockQuantity: 2 })),
    } as unknown as CartRepository;
    const response = await new CartService(repository).get({ userId: 'user-id' });

    expect(response.hasUnavailableItems).toBe(true);
    expect(response.items[0]).toMatchObject({
      issue: 'INSUFFICIENT_STOCK',
      isAvailable: false,
      maxQuantity: 2,
    });
  });

  it('adds onto an existing quantity and rejects amounts above stock', async () => {
    let persistedQuantity: number | null = null;
    const repository = {
      findByOwner: () => Promise.resolve(cart(2)),
      findVariant: () => Promise.resolve({ ...variant, stockQuantity: 3 }),
      setItem: (_owner: ShopperOwner, _variantId: string, quantity: number) => {
        persistedQuantity = quantity;
        return Promise.resolve(cart(quantity));
      },
    } as unknown as CartRepository;
    const service = new CartService(repository);

    await expect(
      service.add({ userId: 'user-id' }, { variantId: variant.id, quantity: 2 }),
    ).rejects.toThrow('Only 3 units');
    expect(persistedQuantity).toBeNull();
  });

  it('merges a guest cart before reading the customer cart', async () => {
    const calls: string[] = [];
    const repository = {
      mergeGuestIntoUser: (userId: string, guestTokenHash: string) => {
        calls.push(`merge:${userId}:${guestTokenHash}`);
        return Promise.resolve();
      },
      findByOwner: (owner: ShopperOwner) => {
        calls.push(`find:${owner.userId ?? 'guest'}`);
        return Promise.resolve(null);
      },
    } as unknown as CartRepository;

    await new CartService(repository).get({ userId: 'customer', guestTokenHash: 'guest-hash' });

    expect(calls).toEqual(['merge:customer:guest-hash', 'find:customer']);
  });
});
