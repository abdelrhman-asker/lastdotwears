import { createReadStream } from 'node:fs';

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import {
  ConfirmInstaPayDto,
  ListAdminOrdersQueryDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  UpdateOrderStatusDto,
} from '../dto/order.dto.js';
import { OrdersService } from '../services/orders.service.js';

@ApiTags('Admin Orders')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  list(@Query() query: ListAdminOrdersQueryDto): Promise<PaginatedOrdersResponseDto> {
    return this.service.listAdmin(query);
  }

  @Get(':id/payment-proof')
  @ApiOperation({ summary: 'View a customer’s submitted InstaPay transfer receipt' })
  async paymentProof(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.service.adminPaymentProof(id);
    response.set({
      'Cache-Control': 'private, no-store',
      'Content-Length': String(image.bytes),
      'Content-Type': image.contentType,
    });
    return new StreamableFile(createReadStream(image.path));
  }

  @Get(':id')
  @ApiOkResponse({ type: OrderResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.service.adminOrder(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Apply a valid audited order status transition' })
  @ApiOkResponse({ type: OrderResponseDto })
  transition(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.service.transition(actor, id, input);
  }

  @Post(':id/confirm-instapay')
  @ApiOperation({ summary: 'Manually confirm a waiting InstaPay payment' })
  @ApiOkResponse({ type: OrderResponseDto })
  confirm(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ConfirmInstaPayDto,
  ): Promise<OrderResponseDto> {
    return this.service.confirmInstaPay(actor, id, input);
  }
}
