import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { InstaPayService } from '../../payments/services/instapay.service.js';
import { MAIL_SERVICE, type MailService } from '../../mail/interfaces/mail-service.interface.js';
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
  ) {}

  async customerOrder(userId: string, orderNumber: string): Promise<OrderResponseDto> {
    const order = await this.repository.findCustomerOrder(userId, orderNumber);
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
    await this.sendStatusEmail(result);
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
    await this.sendStatusEmail(result);
    return this.toResponse(result);
  }

  async toResponse(order: OrderRecord): Promise<OrderResponseDto> {
    const instructions =
      order.paymentMethod === 'INSTAPAY' && order.paymentStatus === 'WAITING_FOR_PAYMENT'
        ? await this.instaPay.instructions(order.orderNumber, order.totalPiasters)
        : null;
    return OrderResponseDto.from(order, instructions);
  }

  private async sendStatusEmail(order: OrderRecord): Promise<void> {
    await this.mailService
      .sendOrderStatusUpdated(
        { email: order.customerEmail, firstName: order.customerFirstName },
        {
          orderNumber: order.orderNumber,
          status: order.status,
          totalPiasters: order.totalPiasters,
          paymentMethod: order.paymentMethod,
        },
      )
      .catch((error: unknown) =>
        this.logger.error(`Order status email failed for ${order.orderNumber}.`, error),
      );
  }
}
