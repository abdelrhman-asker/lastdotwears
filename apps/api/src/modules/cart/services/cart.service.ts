import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from '../dto/cart.dto.js';
import { CART_REPOSITORY, type CartRepository } from '../interfaces/cart-repository.interface.js';
import type {
  CartItemIssue,
  CartItemRecord,
  CartRecord,
  CartVariantRecord,
} from '../interfaces/cart.interface.js';

@Injectable()
export class CartService {
  constructor(@Inject(CART_REPOSITORY) private readonly repository: CartRepository) {}

  async get(owner: ShopperOwner): Promise<CartResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const cart = await this.repository.findByOwner(prepared);
    return cart ? this.toResponse(cart) : CartResponseDto.empty();
  }

  async add(owner: ShopperOwner, input: AddCartItemDto): Promise<CartResponseDto> {
    const prepared = await this.prepareOwner(owner);
    this.assertOwner(prepared);
    const [cart, variant] = await Promise.all([
      this.repository.findByOwner(prepared),
      this.repository.findVariant(input.variantId),
    ]);
    this.assertSellable(variant);
    const currentQuantity =
      cart?.items.find((item) => item.variant.id === input.variantId)?.quantity ?? 0;
    const targetQuantity = currentQuantity + input.quantity;
    if (targetQuantity > 99) throw new BadRequestException('A cart item cannot exceed 99 units.');
    this.assertStock(variant, targetQuantity);
    return this.toResponse(
      await this.repository.setItem(prepared, input.variantId, targetQuantity),
    );
  }

  async update(
    owner: ShopperOwner,
    variantId: string,
    input: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const cart = await this.repository.findByOwner(prepared);
    if (!cart?.items.some((item) => item.variant.id === variantId)) {
      throw new NotFoundException('Cart item not found.');
    }
    const variant = await this.repository.findVariant(variantId);
    this.assertSellable(variant);
    this.assertStock(variant, input.quantity);
    return this.toResponse(await this.repository.setItem(prepared, variantId, input.quantity));
  }

  async remove(owner: ShopperOwner, variantId: string): Promise<CartResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const cart = await this.repository.removeItem(prepared, variantId);
    return cart ? this.toResponse(cart) : CartResponseDto.empty();
  }

  async clear(owner: ShopperOwner): Promise<CartResponseDto> {
    const prepared = await this.prepareOwner(owner);
    const cart = await this.repository.clear(prepared);
    return cart ? this.toResponse(cart) : CartResponseDto.empty();
  }

  private async prepareOwner(owner: ShopperOwner): Promise<ShopperOwner> {
    if (owner.userId && owner.guestTokenHash) {
      await this.repository.mergeGuestIntoUser(owner.userId, owner.guestTokenHash);
      return { userId: owner.userId };
    }
    return owner;
  }

  private toResponse(cart: CartRecord): CartResponseDto {
    const items = cart.items.map((item) => this.toItem(item));
    return {
      id: cart.id,
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotalPiasters: items.reduce((total, item) => total + item.lineTotalPiasters, 0),
      hasUnavailableItems: items.some((item) => !item.isAvailable),
      updatedAt: cart.updatedAt,
    };
  }

  private toItem(item: CartItemRecord) {
    const unitPricePiasters =
      item.variant.priceOverridePiasters ??
      item.variant.product.salePricePiasters ??
      item.variant.product.pricePiasters;
    const issue = this.issue(item.variant, item.quantity);
    return {
      id: item.id,
      quantity: item.quantity,
      unitPricePiasters,
      lineTotalPiasters: unitPricePiasters * item.quantity,
      maxQuantity: Math.min(99, Math.max(0, item.variant.stockQuantity)),
      isAvailable: issue === null,
      issue,
      product: {
        id: item.variant.product.id,
        name: item.variant.product.name,
        slug: item.variant.product.slug,
        brandName: item.variant.product.brandName,
        imageUrl: item.variant.product.image?.secureUrl ?? null,
        imageAlt: item.variant.product.image?.altText ?? null,
      },
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        size: item.variant.size,
        colorName: item.variant.colorName,
        colorHex: item.variant.colorHex,
      },
    };
  }

  private issue(variant: CartVariantRecord, quantity: number): CartItemIssue | null {
    if (
      variant.deletedAt ||
      !variant.isActive ||
      variant.product.deletedAt ||
      variant.product.status !== 'ACTIVE'
    ) {
      return 'UNAVAILABLE';
    }
    if (variant.stockQuantity <= 0) return 'OUT_OF_STOCK';
    if (quantity > variant.stockQuantity) return 'INSUFFICIENT_STOCK';
    return null;
  }

  private assertOwner(owner: ShopperOwner): void {
    if (!owner.userId && (!owner.guestTokenHash || !owner.guestExpiresAt)) {
      throw new Error('A customer or guest cart identity is required.');
    }
  }

  private assertSellable(variant: CartVariantRecord | null): asserts variant is CartVariantRecord {
    if (!variant || this.issue(variant, 1) === 'UNAVAILABLE') {
      throw new NotFoundException('Product variant is not available.');
    }
    if (variant.stockQuantity <= 0) throw new ConflictException('Product variant is out of stock.');
  }

  private assertStock(variant: CartVariantRecord, quantity: number): void {
    if (quantity > variant.stockQuantity) {
      throw new ConflictException(`Only ${variant.stockQuantity} units are currently available.`);
    }
  }
}
