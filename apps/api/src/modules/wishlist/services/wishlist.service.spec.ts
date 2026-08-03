import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import type { WishlistRepository } from '../interfaces/wishlist-repository.interface.js';
import type { WishlistProductRecord, WishlistRecord } from '../interfaces/wishlist.interface.js';
import { WishlistService } from './wishlist.service.js';

const product: WishlistProductRecord = {
  id: 'f2bde76a-67b1-4f72-ad74-6ce81d69a50f',
  name: 'Everyday Tote',
  slug: 'everyday-tote',
  pricePiasters: 149_900,
  salePricePiasters: null,
  status: 'ACTIVE',
  deletedAt: null,
  brandName: 'Nile Studio',
  image: null,
  stockQuantity: 4,
};

function wishlist(itemProduct = product): WishlistRecord {
  const now = new Date('2026-08-02T00:00:00Z');
  return {
    id: '26420805-3a26-4bcc-bd9e-d564957b7d40',
    updatedAt: now,
    items: [{ id: 'f2d5f350-c392-45bb-aa54-3912dfb36221', createdAt: now, product: itemProduct }],
  };
}

describe('WishlistService', () => {
  it('maps live product pricing and availability', async () => {
    const repository = {
      findByOwner: () => Promise.resolve(wishlist()),
    } as unknown as WishlistRepository;
    const response = await new WishlistService(repository).get({ userId: 'customer' });

    expect(response).toMatchObject({
      itemCount: 1,
      items: [{ product: { name: 'Everyday Tote', pricePiasters: 149_900, isAvailable: true } }],
    });
  });

  it('rejects attempts to save a non-public product', async () => {
    const repository = {
      findProduct: () => Promise.resolve({ ...product, status: 'ARCHIVED' as const }),
    } as unknown as WishlistRepository;

    await expect(
      new WishlistService(repository).add({ userId: 'customer' }, { productId: product.id }),
    ).rejects.toThrow('Product is not available.');
  });

  it('merges guest items before loading the customer wishlist', async () => {
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
    } as unknown as WishlistRepository;

    await new WishlistService(repository).get({ userId: 'customer', guestTokenHash: 'guest-hash' });

    expect(calls).toEqual(['merge:customer:guest-hash', 'find:customer']);
  });
});
