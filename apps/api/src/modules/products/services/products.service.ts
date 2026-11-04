import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  createCombinationKey,
  createSlug,
  normalizeSku,
} from '../../../common/utils/catalog-normalization.util.js';
import { hasPrismaCode, prismaUniqueTarget } from '../../../common/utils/prisma-error.util.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import {
  IMAGE_STORAGE,
  type ImageStorage,
} from '../../uploads/interfaces/image-storage.interface.js';
import type {
  AdminProductListQueryDto,
  CreateProductDto,
  CreateProductVariantDto,
  PaginatedProductsResponseDto,
  ProductListQueryDto,
  UpdateProductDto,
  UpdateProductImageDto,
  UpdateProductVariantDto,
  UploadProductImageDto,
} from '../dto/product.dto.js';
import {
  ProductImageResponseDto,
  ProductResponseDto,
  ProductVariantResponseDto,
} from '../dto/product.dto.js';
import {
  PRODUCTS_REPOSITORY,
  type ProductsRepository,
  type VariantConflicts,
  type VariantWriteInput,
} from '../interfaces/products-repository.interface.js';
import type { ProductListQuery, ProductRecord } from '../interfaces/product.interface.js';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(PRODUCTS_REPOSITORY) private readonly repository: ProductsRepository,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async listPublic(query: ProductListQueryDto): Promise<PaginatedProductsResponseDto> {
    return this.list(this.toQuery(query), true);
  }

  async listAdmin(query: AdminProductListQueryDto): Promise<PaginatedProductsResponseDto> {
    return this.list(this.toQuery(query), false);
  }

  async getPublic(slug: string): Promise<ProductResponseDto> {
    const product = await this.repository.findPublicBySlug(slug);
    if (!product) throw new NotFoundException('Product not found.');
    return ProductResponseDto.from(product);
  }

  async getAdmin(id: string): Promise<ProductResponseDto> {
    return ProductResponseDto.from(await this.requireProduct(id));
  }

  async create(actor: AuthenticatedUser, input: CreateProductDto): Promise<ProductResponseDto> {
    this.assertPrices(input.pricePiasters, input.salePricePiasters ?? null);
    if (!(await this.repository.catalogReferencesExist(input.categoryId, input.brandId))) {
      throw new BadRequestException('Category or brand does not exist.');
    }
    const slug = input.slug ?? createSlug(input.name);
    if (!slug) throw new BadRequestException('Provide an English slug for this product name.');
    const variants = input.variants.map((variant) => this.variantInput(variant));
    this.assertUniqueVariants(variants);
    if (input.status === 'ACTIVE' && !variants.some((variant) => variant.isActive)) {
      throw new BadRequestException('An active product needs at least one active variant.');
    }
    try {
      return ProductResponseDto.from(
        await this.repository.create({
          name: input.name,
          slug,
          description: input.description,
          pricePiasters: input.pricePiasters,
          salePricePiasters: input.salePricePiasters ?? null,
          categoryId: input.categoryId,
          brandId: input.brandId,
          status: input.status ?? 'DRAFT',
          isFeatured: input.isFeatured ?? false,
          isNewArrival: input.isNewArrival ?? false,
          variants,
          actorId: actor.id,
        }),
      );
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async update(id: string, input: UpdateProductDto): Promise<ProductResponseDto> {
    const existing = await this.requireProduct(id);
    const categoryId = input.categoryId ?? existing.categoryId;
    const brandId = input.brandId ?? existing.brandId;
    if (
      (input.categoryId !== undefined || input.brandId !== undefined) &&
      !(await this.repository.catalogReferencesExist(categoryId, brandId))
    ) {
      throw new BadRequestException('Category or brand does not exist.');
    }
    const pricePiasters = input.pricePiasters ?? existing.pricePiasters;
    const salePricePiasters =
      input.salePricePiasters !== undefined ? input.salePricePiasters : existing.salePricePiasters;
    this.assertPrices(pricePiasters, salePricePiasters);
    if (input.status === 'ACTIVE' && (await this.repository.activeVariantCount(id)) === 0) {
      throw new BadRequestException('An active product needs at least one active variant.');
    }
    try {
      const product = await this.repository.update(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.pricePiasters !== undefined ? { pricePiasters: input.pricePiasters } : {}),
        ...(input.salePricePiasters !== undefined
          ? { salePricePiasters: input.salePricePiasters }
          : {}),
        ...(input.pricePiasters !== undefined || input.salePricePiasters !== undefined
          ? { sortPricePiasters: salePricePiasters ?? pricePiasters }
          : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...(input.isNewArrival !== undefined ? { isNewArrival: input.isNewArrival } : {}),
      });
      if (!product) throw new NotFoundException('Product not found.');
      return ProductResponseDto.from(product);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.requireProduct(id);
    if (!(await this.repository.softDelete(id))) throw new NotFoundException('Product not found.');
  }

  async createVariant(
    actor: AuthenticatedUser,
    productId: string,
    input: CreateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    await this.requireProduct(productId);
    const variant = this.variantInput(input);
    const restoreId = this.resolveVariantConflicts(
      await this.repository.findVariantConflicts(productId, variant.sku, variant.combinationKey),
      productId,
    );
    try {
      if (restoreId) {
        const restored = await this.repository.restoreVariant(
          productId,
          restoreId,
          variant,
          actor.id,
        );
        if (restored) return ProductVariantResponseDto.from(restored);
      }
      return ProductVariantResponseDto.from(
        await this.repository.createVariant(productId, variant, actor.id),
      );
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateProductVariantDto,
  ): Promise<ProductVariantResponseDto> {
    const product = await this.requireProduct(productId);
    const variant = await this.repository.findVariant(productId, variantId);
    if (!variant) throw new NotFoundException('Product variant not found.');
    if (
      input.isActive === false &&
      product.status === 'ACTIVE' &&
      (await this.repository.activeVariantCount(productId)) <= 1
    ) {
      throw new ConflictException('An active product must keep at least one active variant.');
    }
    const size = input.size ?? variant.size;
    const colorName = input.colorName ?? variant.colorName;
    try {
      const updated = await this.repository.updateVariant(productId, variantId, {
        ...(input.sku !== undefined ? { sku: normalizeSku(input.sku) } : {}),
        ...(input.size !== undefined ? { size: input.size } : {}),
        ...(input.colorName !== undefined ? { colorName: input.colorName } : {}),
        ...(input.colorHex !== undefined
          ? { colorHex: input.colorHex?.toUpperCase() ?? null }
          : {}),
        ...(input.priceOverridePiasters !== undefined
          ? { priceOverridePiasters: input.priceOverridePiasters }
          : {}),
        ...(input.lowStockThreshold !== undefined
          ? { lowStockThreshold: input.lowStockThreshold }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.size !== undefined || input.colorName !== undefined
          ? { combinationKey: createCombinationKey(size, colorName) }
          : {}),
      });
      if (!updated) throw new NotFoundException('Product variant not found.');
      return ProductVariantResponseDto.from(updated);
    } catch (error) {
      this.handleUniqueError(error);
    }
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    const product = await this.requireProduct(productId);
    if (!(await this.repository.findVariant(productId, variantId))) {
      throw new NotFoundException('Product variant not found.');
    }
    if (product.status === 'ACTIVE' && (await this.repository.activeVariantCount(productId)) <= 1) {
      throw new ConflictException('An active product must keep at least one active variant.');
    }
    if (!(await this.repository.deactivateVariant(productId, variantId))) {
      throw new NotFoundException('Product variant not found.');
    }
  }

  async uploadImage(
    productId: string,
    file: Express.Multer.File,
    input: UploadProductImageDto,
  ): Promise<ProductImageResponseDto> {
    await this.requireProduct(productId);
    const stored = await this.imageStorage.uploadProductImage(file.buffer, productId);
    try {
      return ProductImageResponseDto.from(
        await this.repository.createImage(productId, {
          ...stored,
          altText: input.altText,
          position: input.position ?? 0,
          isPrimary: input.isPrimary ?? false,
        }),
      );
    } catch (error) {
      await this.imageStorage.deleteImage(stored.publicId).catch(() => undefined);
      throw error;
    }
  }

  async updateImage(
    productId: string,
    imageId: string,
    input: UpdateProductImageDto,
  ): Promise<ProductImageResponseDto> {
    await this.requireProduct(productId);
    const image = await this.repository.updateImage(productId, imageId, input);
    if (!image) throw new NotFoundException('Product image not found.');
    return ProductImageResponseDto.from(image);
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    await this.requireProduct(productId);
    const image = await this.repository.findImage(productId, imageId);
    if (!image) throw new NotFoundException('Product image not found.');
    await this.imageStorage.deleteImage(image.publicId);
    if (!(await this.repository.deleteImage(productId, imageId))) {
      throw new NotFoundException('Product image not found.');
    }
  }

  private async list(
    query: ProductListQuery,
    isPublic: boolean,
  ): Promise<PaginatedProductsResponseDto> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('Minimum price cannot exceed maximum price.');
    }
    const result = isPublic
      ? await this.repository.listPublic(query)
      : await this.repository.listAdmin(query);
    return {
      items: result.items.map((product) => ProductResponseDto.from(product)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  private toQuery(query: ProductListQueryDto | AdminProductListQueryDto): ProductListQuery {
    return {
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      ...(query.search ? { search: query.search } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.brand ? { brand: query.brand } : {}),
      ...(query.size ? { size: query.size } : {}),
      ...(query.color ? { color: query.color } : {}),
      ...(query.featured === undefined ? {} : { featured: query.featured }),
      ...(query.newArrival === undefined ? {} : { newArrival: query.newArrival }),
      ...(query.minPrice === undefined ? {} : { minPrice: query.minPrice }),
      ...(query.maxPrice === undefined ? {} : { maxPrice: query.maxPrice }),
      ...('status' in query && query.status ? { status: query.status } : {}),
    };
  }

  private async requireProduct(id: string): Promise<ProductRecord> {
    const product = await this.repository.findById(id);
    if (!product) throw new NotFoundException('Product not found.');
    return product;
  }

  private variantInput(input: CreateProductVariantDto): VariantWriteInput {
    return {
      sku: normalizeSku(input.sku),
      size: input.size,
      colorName: input.colorName,
      colorHex: input.colorHex?.toUpperCase() ?? null,
      combinationKey: createCombinationKey(input.size, input.colorName),
      priceOverridePiasters: input.priceOverridePiasters ?? null,
      stockQuantity: input.stockQuantity,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      isActive: input.isActive ?? true,
      position: input.position ?? 0,
    };
  }

  private assertUniqueVariants(variants: VariantWriteInput[]): void {
    if (new Set(variants.map((variant) => variant.sku)).size !== variants.length) {
      throw new BadRequestException('Variant SKUs must be unique.');
    }
    if (new Set(variants.map((variant) => variant.combinationKey)).size !== variants.length) {
      throw new BadRequestException('Each size and color combination must be unique.');
    }
  }

  private assertPrices(price: number, salePrice: number | null): void {
    if (salePrice !== null && salePrice >= price) {
      throw new BadRequestException('Sale price must be lower than the regular price.');
    }
  }

  /**
   * Removed variants stay in the table so order history keeps its references, but their SKU and
   * size/color combination still occupy the unique indexes. Re-adding one restores that row
   * instead of failing on a constraint the administrator cannot see.
   */
  private resolveVariantConflicts(conflicts: VariantConflicts, productId: string): string | null {
    const { bySku, byCombination } = conflicts;
    if (bySku && !bySku.isDeleted) {
      throw new ConflictException(`SKU ${bySku.sku} already belongs to another variant.`);
    }
    if (byCombination && !byCombination.isDeleted) {
      throw new ConflictException(
        `This product already has a ${byCombination.size} / ${byCombination.colorName} variant.`,
      );
    }
    if (bySku && bySku.productId !== productId) {
      throw new ConflictException(
        `SKU ${bySku.sku} belongs to a removed variant of another product. Choose a different SKU.`,
      );
    }
    if (bySku && byCombination && bySku.id !== byCombination.id) {
      throw new ConflictException(
        `SKU ${bySku.sku} belongs to a different removed variant of this product. Choose another SKU to restore ${byCombination.size} / ${byCombination.colorName}.`,
      );
    }
    return byCombination?.id ?? bySku?.id ?? null;
  }

  private handleUniqueError(error: unknown): never {
    if (hasPrismaCode(error, 'P2002')) {
      const target = prismaUniqueTarget(error).toLowerCase();
      if (target.includes('combination')) {
        throw new ConflictException(
          'Another variant on this product already uses this size and color.',
        );
      }
      if (target.includes('sku')) {
        throw new ConflictException('This SKU already belongs to another variant.');
      }
      if (target.includes('slug')) {
        throw new ConflictException('This product slug is already in use.');
      }
      throw new ConflictException('Product slug, SKU, or size/color combination already exists.');
    }
    throw error;
  }
}
