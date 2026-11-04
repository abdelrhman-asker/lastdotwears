import { createReadStream } from 'node:fs';

import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { PaymentProofImageFilePipe } from '../../uploads/pipes/payment-proof-image-file.pipe.js';
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

  @Post(':orderNumber/payment-proof')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8_000_000, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Submit an InstaPay transfer receipt for review' })
  @ApiOkResponse({ type: OrderResponseDto })
  submitPaymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
    @UploadedFile(PaymentProofImageFilePipe) file: Express.Multer.File,
  ): Promise<OrderResponseDto> {
    return this.service.submitInstaPayProof(user.id, orderNumber, file);
  }

  @Get(':orderNumber/payment-proof')
  @ApiOperation({ summary: 'View the current customer’s submitted transfer receipt' })
  async paymentProof(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const image = await this.service.customerPaymentProof(user.id, orderNumber);
    response.set({
      'Cache-Control': 'private, no-store',
      'Content-Length': String(image.bytes),
      'Content-Type': image.contentType,
    });
    return new StreamableFile(createReadStream(image.path));
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
