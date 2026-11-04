import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { ShopperOwner } from '../../shopper/interfaces/shopper-owner.interface.js';
import { InstaPayService } from '../../payments/services/instapay.service.js';
import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
import { mailErrorDetails } from '../../mail/utils/mail-error.util.js';
import {
  IMAGE_STORAGE,
  type ImageStorage,
  type StoredImageFile,
} from '../../uploads/interfaces/image-storage.interface.js';
import type {
  ConfirmInstaPayDto,
  ListAdminOrdersQueryDto,
  ListCustomerOrdersQueryDto,
  PaginatedOrdersResponseDto,
  PaginatedCustomerOrdersResponseDto,
  UpdateOrderStatusDto,
} from '../dto/order.dto.js';
import { OrderResponseDto, OrderSummaryResponseDto } from '../dto/order.dto.js';
import type { OrderRecord, OrderStatus } from '../interfaces/order.interface.js';
import {
  ORDERS_REPOSITORY,
  type OrdersRepository,
} from '../interfaces/orders-repository.interface.js';

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  WAITING_FOR_PAYMENT: ['CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(ORDERS_REPOSITORY) private readonly repository: OrdersRepository,
    private readonly instaPay: InstaPayService,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async customerOrder(userId: string, orderNumber: string): Promise<OrderResponseDto> {
    const order = await this.repository.findCustomerOrder(userId, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return this.toResponse(order);
  }

  async shopperOrder(owner: ShopperOwner, orderNumber: string): Promise<OrderResponseDto> {
    this.assertShopperOwner(owner);
    const order = await this.repository.findShopperOrder(owner, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return this.toResponse(order);
  }

  async listCustomer(
    userId: string,
    query: ListCustomerOrdersQueryDto,
  ): Promise<PaginatedCustomerOrdersResponseDto> {
    const result = await this.repository.listCustomer({
      userId,
      page: query.page,
      limit: query.limit,
      ...(query.status ? { status: query.status } : {}),
    });
    return {
      items: result.items.map((order) => OrderSummaryResponseDto.from(order)),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async adminOrder(id: string): Promise<OrderResponseDto> {
    const order = await this.repository.findAdminOrder(id);
    if (!order) throw new NotFoundException('Order not found.');
    return this.toResponse(order);
  }

  async submitInstaPayProof(
    userId: string,
    orderNumber: string,
    file: Express.Multer.File,
  ): Promise<OrderResponseDto> {
    const current = await this.repository.findCustomerOrder(userId, orderNumber);
    return this.submitOwnedInstaPayProof(current, { userId }, orderNumber, file);
  }

  async submitShopperInstaPayProof(
    owner: ShopperOwner,
    orderNumber: string,
    file: Express.Multer.File,
  ): Promise<OrderResponseDto> {
    this.assertShopperOwner(owner);
    const current = await this.repository.findShopperOrder(owner, orderNumber);
    return this.submitOwnedInstaPayProof(current, owner, orderNumber, file);
  }

  private async submitOwnedInstaPayProof(
    current: OrderRecord | null,
    owner: ShopperOwner,
    orderNumber: string,
    file: Express.Multer.File,
  ): Promise<OrderResponseDto> {
    if (!current) throw new NotFoundException('Order not found.');
    if (
      current.paymentMethod !== 'INSTAPAY' ||
      current.status !== 'WAITING_FOR_PAYMENT' ||
      current.paymentStatus !== 'WAITING_FOR_PAYMENT'
    ) {
      throw new ConflictException('This order is not waiting for an InstaPay transfer receipt.');
    }
    if (current.payment.proofSubmittedAt) {
      throw new ConflictException('A transfer receipt has already been submitted for this order.');
    }

    const storageOwner = owner.userId ?? owner.guestTokenHash;
    if (!storageOwner) throw new NotFoundException('Order not found.');
    const stored = await this.imageStorage.uploadPaymentProof(file.buffer, storageOwner);
    let committed = false;
    try {
      const result = await this.repository.submitInstaPayProof({
        owner,
        orderNumber,
        proofImagePublicId: stored.publicId,
        submittedAt: new Date(),
      });
      if (result === 'not_found') throw new NotFoundException('Order not found.');
      if (result === 'conflict') {
        throw new ConflictException(
          'The transfer receipt was already submitted or the order changed.',
        );
      }
      committed = true;
      const receipt = await this.imageStorage.readImage(stored.publicId).catch((error: unknown) => {
        this.logger.error(
          `Transfer receipt could not be attached for ${result.orderNumber}: ${mailErrorDetails(error)}`,
        );
        return null;
      });
      await this.mailService
        .sendOrderReceivedEmail(result, receipt ?? undefined)
        .catch((error: unknown) =>
          this.logger.error(
            `Order received email failed for ${result.orderNumber}: ${mailErrorDetails(error)}`,
          ),
        );
      return this.toResponse(result);
    } finally {
      if (!committed) await this.imageStorage.deleteImage(stored.publicId).catch(() => undefined);
    }
  }

  async customerPaymentProof(userId: string, orderNumber: string): Promise<StoredImageFile> {
    const order = await this.repository.findCustomerOrder(userId, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return this.readPaymentProof(order);
  }

  async shopperPaymentProof(owner: ShopperOwner, orderNumber: string): Promise<StoredImageFile> {
    this.assertShopperOwner(owner);
    const order = await this.repository.findShopperOrder(owner, orderNumber);
    if (!order) throw new NotFoundException('Order not found.');
    return this.readPaymentProof(order);
  }

  async adminPaymentProof(id: string): Promise<StoredImageFile> {
    const order = await this.repository.findAdminOrder(id);
    if (!order) throw new NotFoundException('Order not found.');
    return this.readPaymentProof(order);
  }

  async listAdmin(query: ListAdminOrdersQueryDto): Promise<PaginatedOrdersResponseDto> {
    const result = await this.repository.listAdmin({
      page: query.page,
      limit: query.limit,
      ...(query.search ? { search: query.search } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    });
    return {
      items: await Promise.all(result.items.map((order) => this.toResponse(order))),
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / query.limit),
    };
  }

  async transition(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const current = await this.repository.findAdminOrder(id);
    if (!current) throw new NotFoundException('Order not found.');
    if (!allowedTransitions[current.status].includes(input.status)) {
      throw new BadRequestException(`Order cannot move from ${current.status} to ${input.status}.`);
    }
    if (input.restockItems && input.status !== 'REFUNDED') {
      throw new BadRequestException('Restocking is only configurable for refunded orders.');
    }
    const result = await this.repository.transition({
      orderId: id,
      actorId: actor.id,
      expectedStatus: current.status,
      status: input.status,
      note: input.note || null,
      restockItems: input.status === 'CANCELLED' || Boolean(input.restockItems),
    });
    if (result === 'not_found') throw new NotFoundException('Order not found.');
    if (result === 'conflict') {
      throw new ConflictException('Order changed concurrently. Refresh and try again.');
    }
    if (this.isConfirmationTransition(current.status, result.status)) {
      await this.sendConfirmationEmail(result);
    }
    return this.toResponse(result);
  }

  async confirmInstaPay(
    actor: AuthenticatedUser,
    id: string,
    input: ConfirmInstaPayDto,
  ): Promise<OrderResponseDto> {
    const result = await this.repository.confirmInstaPay({
      orderId: id,
      actorId: actor.id,
      reference: input.reference || null,
      note: input.note || null,
    });
    if (result === 'not_found') throw new NotFoundException('Order not found.');
    if (result === 'conflict') {
      throw new ConflictException('Only a waiting InstaPay order can be confirmed.');
    }
    await this.sendConfirmationEmail(result);
    return this.toResponse(result);
  }

  async toResponse(order: OrderRecord): Promise<OrderResponseDto> {
    const instructions =
      order.paymentMethod === 'INSTAPAY' && order.paymentStatus === 'WAITING_FOR_PAYMENT'
        ? await this.instaPay.instructions(order.orderNumber, order.totalPiasters)
        : null;
    return OrderResponseDto.from(order, instructions);
  }

  private isConfirmationTransition(from: OrderStatus, to: OrderStatus): boolean {
    return (
      (from === 'PENDING' && to === 'PROCESSING') ||
      (from === 'WAITING_FOR_PAYMENT' && to === 'PAID')
    );
  }

  private async sendConfirmationEmail(order: OrderRecord): Promise<void> {
    await this.mailService
      .sendOrderConfirmedEmail(order)
      .catch((error: unknown) =>
        this.logger.error(
          `Order confirmation email failed for ${order.orderNumber}: ${mailErrorDetails(error)}`,
        ),
      );
  }

  private async readPaymentProof(order: OrderRecord): Promise<StoredImageFile> {
    if (!order.payment.proofImagePublicId) {
      throw new NotFoundException('Transfer receipt not found.');
    }
    const image = await this.imageStorage.readImage(order.payment.proofImagePublicId);
    if (!image) throw new NotFoundException('Transfer receipt not found.');
    return image;
  }

  private assertShopperOwner(owner: ShopperOwner): void {
    if (!owner.userId && !owner.guestTokenHash) {
      throw new NotFoundException('Order not found.');
    }
  }
}
