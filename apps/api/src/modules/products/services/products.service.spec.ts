import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { ImageStorage } from '../../uploads/interfaces/image-storage.interface.js';
import type { CreateProductDto } from '../dto/product.dto.js';
import type {
  ProductCreateInput,
  ProductUpdateInput,
  ProductsRepository,
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
