import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import {
  ListCustomerOrdersQueryDto,
  OrderResponseDto,
  PaginatedCustomerOrdersResponseDto,
} from '../dto/order.dto.js';
import { OrdersService } from '../services/orders.service.js';

@ApiTags('Orders')
@ApiBearerAuth()
@Roles('CUSTOMER')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List the current customer order history' })
  @ApiOkResponse({ type: PaginatedCustomerOrdersResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCustomerOrdersQueryDto,
  ): Promise<PaginatedCustomerOrdersResponseDto> {
    return this.service.listCustomer(user.id, query);
  }

  @Get(':orderNumber')
  @ApiOkResponse({ type: OrderResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    return this.service.customerOrder(user.id, orderNumber);
  }

  @Get(':orderNumber/invoice')
  @ApiOperation({ summary: 'Get the immutable printable invoice snapshot for an order' })
  @ApiOkResponse({ type: OrderResponseDto })
  invoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    return this.service.customerOrder(user.id, orderNumber);
  }
}
