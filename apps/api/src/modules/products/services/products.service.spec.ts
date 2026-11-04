import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { ImageStorage } from '../../uploads/interfaces/image-storage.interface.js';
import type { CreateProductDto } from '../dto/product.dto.js';
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductsRepository,
  VariantConflicts,
  VariantIdentity,
  VariantWriteInput,
} from '../interfaces/products-repository.interface.js';
import type { ProductRecord } from '../interfaces/product.interface.js';
import { ProductsService } from './products.service.js';

const actor: AuthenticatedUser = {
  id: 'f8da524c-4d39-4712-9945-895eccde0d21',
  sessionId: '264af772-71bf-4af5-9038-c996be72dd9b',
  email: 'admin@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
  isEmailVerified: true,
};

const input: CreateProductDto = {
  name: 'Relaxed Shirt',
  description: 'A considered cotton shirt.',
  pricePiasters: 150_000,
  salePricePiasters: 120_000,
  categoryId: '35317274-7c03-4893-a896-b36205fc72ac',
  brandId: 'bfdb67f1-ae52-44b5-b69c-d37c56ae6977',
  status: 'ACTIVE',
  variants: [
    {
      sku: ' shirt-blk-m ',
      size: 'M',
      colorName: 'Black',
      colorHex: '#111111',
      stockQuantity: 8,
    },
  ],
};

function productFromCreate(created: ProductCreateInput): ProductRecord {
  const now = new Date('2026-08-02T00:00:00Z');
  return {
    id: '9c486f70-f210-48e4-8483-07a7ec45482d',
    name: created.name,
    slug: created.slug,
    description: created.description,
    pricePiasters: created.pricePiasters,
    salePricePiasters: created.salePricePiasters,
    categoryId: created.categoryId,
    brandId: created.brandId,
    status: created.status,
    isFeatured: created.isFeatured,
    isNewArrival: created.isNewArrival,
    category: { id: created.categoryId, name: 'Men', slug: 'men' },
    brand: { id: created.brandId, name: 'Studio', slug: 'studio' },
    variants: created.variants.map((variant, index) => ({
      id: `9c486f70-f210-48e4-8483-07a7ec4548${index.toString().padStart(2, '0')}`,
      productId: '9c486f70-f210-48e4-8483-07a7ec45482d',
      sku: variant.sku,
      size: variant.size,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      priceOverridePiasters: variant.priceOverridePiasters,
      stockQuantity: variant.stockQuantity,
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive,
      position: variant.position,
      createdAt: now,
      updatedAt: now,
    })),
    images: [],
    createdAt: now,
    updatedAt: now,
  };
}

function fixture(referencesExist = true) {
  let created: ProductCreateInput | null = null;
  const repository = {
    catalogReferencesExist: () => Promise.resolve(referencesExist),
    create: (value: ProductCreateInput) => {
      created = value;
      return Promise.resolve(productFromCreate(value));
    },
  } as unknown as ProductsRepository;
  const service = new ProductsService(repository, {} as ImageStorage);
  return { created: () => created, service };
}

describe('ProductsService', () => {
  it('normalizes a product and its variants before persistence', async () => {
    const { created, service } = fixture();

    const product = await service.create(actor, input);

    expect(product.slug).toBe('relaxed-shirt');
    expect(created()).toMatchObject({
      actorId: actor.id,
      slug: 'relaxed-shirt',
      variants: [
        expect.objectContaining({
          sku: 'SHIRT-BLK-M',
          combinationKey: 'm::black',
          lowStockThreshold: 5,
        }),
      ],
    });
  });

  it('rejects a sale price that is not below the regular price', async () => {
    const { service } = fixture();
    await expect(
      service.create(actor, { ...input, salePricePiasters: input.pricePiasters }),
    ).rejects.toThrow('Sale price must be lower');
  });

  it('rejects duplicate size/color combinations before persistence', async () => {
    const { service } = fixture();
    await expect(
      service.create(actor, {
        ...input,
        variants: [
          input.variants[0]!,
          { ...input.variants[0]!, sku: 'SHIRT-BLK-M-SECOND', colorName: ' black ' },
        ],
      }),
    ).rejects.toThrow('Each size and color combination must be unique.');
  });

  it('rejects missing catalog references', async () => {
    const { service } = fixture(false);
    await expect(service.create(actor, input)).rejects.toThrow('Category or brand does not exist.');
  });

  it('restores the regular price as the sort price when a sale is cleared', async () => {
    const existing = productFromCreate({
      ...input,
      slug: 'relaxed-shirt',
      status: 'ACTIVE',
      isFeatured: false,
      isNewArrival: false,
      actorId: actor.id,
      variants: [
        {
          sku: 'SHIRT-BLK-M',
          size: 'M',
          colorName: 'Black',
          colorHex: '#111111',
          combinationKey: 'm::black',
          priceOverridePiasters: null,
          stockQuantity: 8,
          lowStockThreshold: 5,
          isActive: true,
          position: 0,
        },
      ],
    });
    let update: ProductUpdateInput | null = null;
    const repository = {
      findById: () => Promise.resolve(existing),
      update: (_id: string, value: ProductUpdateInput) => {
        update = value;
        return Promise.resolve({ ...existing, salePricePiasters: null });
      },
    } as unknown as ProductsRepository;
    const service = new ProductsService(repository, {} as ImageStorage);

    await service.update(existing.id, { salePricePiasters: null });

    expect(update).toEqual({ salePricePiasters: null, sortPricePiasters: input.pricePiasters });
  });
});

describe('ProductsService variant conflicts', () => {
  const productId = '9c486f70-f210-48e4-8483-07a7ec45482d';
  const removedVariantId = '5f2b1f4e-6b3a-4c1d-9f0e-2a7c8d9e0b11';

  const removed: VariantIdentity = {
    id: removedVariantId,
    productId,
    sku: 'SHIRT-BLK-M',
    size: 'M',
    colorName: 'Black',
    isDeleted: true,
  };

  const newVariant = {
    sku: 'shirt-blk-m',
    size: 'M',
    colorName: 'Black',
    colorHex: '#111111',
    stockQuantity: 4,
  };

  function variantFixture(conflicts: VariantConflicts) {
    const calls: {
      created: number;
      restored: VariantWriteInput | null;
      restoredId: string | null;
    } = { created: 0, restored: null, restoredId: null };
    const repository = {
      findById: () => Promise.resolve({ id: productId, status: 'ACTIVE' } as ProductRecord),
      findVariantConflicts: () => Promise.resolve(conflicts),
      restoreVariant: (_productId: string, variantId: string, value: VariantWriteInput) => {
        calls.restored = value;
        calls.restoredId = variantId;
        return Promise.resolve({
          id: variantId,
          productId,
          sku: value.sku,
          size: value.size,
          colorName: value.colorName,
          colorHex: value.colorHex,
          priceOverridePiasters: value.priceOverridePiasters,
          stockQuantity: value.stockQuantity,
          lowStockThreshold: value.lowStockThreshold,
          isActive: value.isActive,
          position: value.position,
          createdAt: new Date('2026-08-02T00:00:00Z'),
          updatedAt: new Date('2026-08-18T00:00:00Z'),
        });
      },
      createVariant: () => {
        calls.created += 1;
        return Promise.reject(new Error('createVariant should not run'));
      },
    } as unknown as ProductsRepository;
    return { calls, service: new ProductsService(repository, {} as ImageStorage) };
  }

  it('restores a removed variant instead of failing on the unique index', async () => {
    const { calls, service } = variantFixture({ bySku: removed, byCombination: removed });

    const variant = await service.createVariant(actor, productId, newVariant);

    expect(calls.created).toBe(0);
    expect(calls.restoredId).toBe(removedVariantId);
    expect(calls.restored).toMatchObject({
      sku: 'SHIRT-BLK-M',
      combinationKey: 'm::black',
      stockQuantity: 4,
      isActive: true,
    });
    expect(variant.id).toBe(removedVariantId);
    expect(variant.isActive).toBe(true);
  });

  it('restores by size and color when the administrator supplies a fresh SKU', async () => {
    const { calls, service } = variantFixture({ bySku: null, byCombination: removed });

    await service.createVariant(actor, productId, { ...newVariant, sku: 'SHIRT-BLK-M-V2' });

    expect(calls.restoredId).toBe(removedVariantId);
    expect(calls.restored).toMatchObject({ sku: 'SHIRT-BLK-M-V2' });
  });

  it('rejects a SKU that a live variant still owns', async () => {
    const { service } = variantFixture({
      bySku: { ...removed, id: 'other', isDeleted: false },
      byCombination: null,
    });

    await expect(service.createVariant(actor, productId, newVariant)).rejects.toThrow(
      'SKU SHIRT-BLK-M already belongs to another variant.',
    );
  });

  it('rejects a live size and color combination', async () => {
    const { service } = variantFixture({
      bySku: null,
      byCombination: { ...removed, id: 'other', isDeleted: false },
    });

    await expect(service.createVariant(actor, productId, newVariant)).rejects.toThrow(
      'This product already has a M / Black variant.',
    );
  });

  it('rejects a removed SKU that belongs to another product', async () => {
    const { service } = variantFixture({
      bySku: { ...removed, productId: 'bfdb67f1-ae52-44b5-b69c-d37c56ae6977' },
      byCombination: null,
    });

    await expect(service.createVariant(actor, productId, newVariant)).rejects.toThrow(
      'belongs to a removed variant of another product',
    );
  });

  it('rejects restoring when the SKU belongs to a different removed variant', async () => {
    const { service } = variantFixture({
      bySku: { ...removed, id: 'a-different-removed-row' },
      byCombination: removed,
    });

    await expect(service.createVariant(actor, productId, newVariant)).rejects.toThrow(
      'belongs to a different removed variant of this product',
    );
  });
});
