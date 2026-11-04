import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { CartResponseDto } from '../../cart/dto/cart.dto.js';
import { CartService } from '../../cart/services/cart.service.js';
import type { OrderResponseDto } from '../../orders/dto/order.dto.js';
import { OrdersService } from '../../orders/services/orders.service.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
import { mailErrorDetails } from '../../mail/utils/mail-error.util.js';
import type { CheckoutQuoteDto, PlaceOrderDto } from '../dto/checkout.dto.js';
import type { CheckoutQuoteResponseDto } from '../dto/checkout.dto.js';
import {
  CHECKOUT_REPOSITORY,
  type CheckoutRepository,
} from '../interfaces/checkout-repository.interface.js';
import type { CheckoutFailure } from '../interfaces/checkout.interface.js';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @Inject(CHECKOUT_REPOSITORY) private readonly repository: CheckoutRepository,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly settingsService: SettingsService,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {}

  async quote(
    user: AuthenticatedUser | undefined,
    owner: ShopperOwner,
    input: CheckoutQuoteDto,
  ): Promise<CheckoutQuoteResponseDto> {
    this.assertCustomer(user);
    this.assertOwner(owner);
    await this.prepareCart(owner);
    const result = await this.repository.quote(
      owner,
      input.governorateCode,
      input.couponCode || null,
    );
    if (result.kind !== 'ok') this.throwFailure(result);
    return result.quote;
  }

  async place(
    user: AuthenticatedUser | undefined,
    owner: ShopperOwner,
    input: PlaceOrderDto,
  ): Promise<OrderResponseDto> {
    this.assertCustomer(user);
    this.assertOwner(owner);
    const paymentSettings = await this.settingsService.paymentSettings();
    if (input.paymentMethod === 'CASH_ON_DELIVERY' && !paymentSettings.cashOnDeliveryEnabled) {
      throw new BadRequestException('Cash on delivery is temporarily unavailable.');
    }
    if (input.paymentMethod === 'INSTAPAY' && !paymentSettings.instaPayEnabled) {
      throw new BadRequestException('InstaPay is temporarily unavailable.');
    }
    // Do not reject an empty bag before the repository checks the idempotency key: a retry after
    // a successful order correctly returns the original order even though its cart was cleared.
    const cart = await this.cartService.get(owner);
    if (cart.items.length > 0 && cart.hasUnavailableItems) {
      throw new ConflictException('Update unavailable shopping bag items before checkout.');
    }
    const result = await this.repository.place(owner, {
      idempotencyKey: input.idempotencyKey,
      couponCode: input.couponCode || null,
      governorateCode: input.governorateCode,
      paymentMethod: input.paymentMethod,
      customerFirstName: input.customerFirstName,
      customerLastName: input.customerLastName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      shippingCity: input.shippingCity,
      shippingAddressLine1: input.shippingAddressLine1,
      shippingAddressLine2: input.shippingAddressLine2 || null,
      shippingPostalCode: input.shippingPostalCode || null,
      deliveryNotes: input.deliveryNotes || null,
    });
    if (result.kind !== 'ok') this.throwFailure(result);
    if (!result.idempotentReplay) {
      const mailOperations = [
        this.mailService.sendNewOrderNotification(result.order).catch((error: unknown) =>
          this.logger.error(
            `New order notification failed for ${result.order.orderNumber}: ${mailErrorDetails(error)}`,
          ),
        ),
      ];
      if (result.order.paymentMethod === 'CASH_ON_DELIVERY') {
        mailOperations.push(
          this.mailService.sendOrderReceivedEmail(result.order).catch((error: unknown) =>
            this.logger.error(
              `Order received email failed for ${result.order.orderNumber}: ${mailErrorDetails(error)}`,
            ),
          ),
        );
      }
      await Promise.all(mailOperations);
    }
    return this.ordersService.toResponse(result.order);
  }

  private assertCustomer(user: AuthenticatedUser | undefined): void {
    if (user && user.role !== 'CUSTOMER') {
      throw new BadRequestException('Checkout requires a customer account.');
    }
  }

  private assertOwner(owner: ShopperOwner): void {
    if (!owner.userId && !owner.guestTokenHash) {
      throw new BadRequestException('Your shopping bag is empty.');
    }
  }

  private async prepareCart(owner: ShopperOwner): Promise<CartResponseDto> {
    const cart = await this.cartService.get(owner);
    if (cart.items.length === 0) throw new BadRequestException('Your shopping bag is empty.');
    if (cart.hasUnavailableItems) {
      throw new ConflictException('Update unavailable shopping bag items before checkout.');
    }
    return cart;
  }

  private throwFailure(failure: CheckoutFailure): never {
    if (failure.kind === 'empty_cart') throw new BadRequestException('Your shopping bag is empty.');
    if (failure.kind === 'shipping_unavailable') {
      throw new BadRequestException('Shipping is not available for this governorate.');
    }
    if (failure.kind === 'coupon_invalid') throw new BadRequestException(failure.detail);
    if (failure.kind === 'cart_changed') throw new ConflictException(failure.detail);
    throw new ConflictException('Checkout changed concurrently. Review your bag and try again.');
  }
}
