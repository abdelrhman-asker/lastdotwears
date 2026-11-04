import { createReadStream } from 'node:fs';

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { OptionalCurrentUser } from '../../../common/decorators/optional-current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { OrderResponseDto } from '../../orders/dto/order.dto.js';
import { OrdersService } from '../../orders/services/orders.service.js';
import { OptionalJwtAuthenticationGuard } from '../../shopper/guards/optional-jwt-authentication.guard.js';
import { PaymentProofImageFilePipe } from '../../uploads/pipes/payment-proof-image-file.pipe.js';
import {
  GUEST_CART_COOKIE,
  ShopperIdentityService,
} from '../../shopper/services/shopper-identity.service.js';
import { CheckoutQuoteDto, CheckoutQuoteResponseDto, PlaceOrderDto } from '../dto/checkout.dto.js';
import { CheckoutService } from '../services/checkout.service.js';

@ApiTags('Checkout')
@Public()
@UseGuards(OptionalJwtAuthenticationGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly service: CheckoutService,
    private readonly identity: ShopperIdentityService,
    private readonly orders: OrdersService,
  ) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recalculate cart, coupon, shipping, and total server-side' })
  @ApiOkResponse({ type: CheckoutQuoteResponseDto })
  async quote(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: CheckoutQuoteDto,
  ): Promise<CheckoutQuoteResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const quote = await this.service.quote(user, owner, input);
    if (user && owner.guestTokenHash) this.identity.clearMergedGuest(response, GUEST_CART_COOKIE);
    return quote;
  }

  @Post('orders')
  @HttpCode(200)
  @ApiOperation({ summary: 'Place an idempotent COD or manual InstaPay order' })
  @ApiOkResponse({ type: OrderResponseDto })
  async place(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: PlaceOrderDto,
  ): Promise<OrderResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const order = await this.service.place(user, owner, input);
    if (user && owner.guestTokenHash) this.identity.clearMergedGuest(response, GUEST_CART_COOKIE);
    return order;
  }

  @Get('orders/:orderNumber')
  @ApiOperation({ summary: 'Get an order owned by the current guest or customer' })
  @ApiOkResponse({ type: OrderResponseDto })
  order(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    return this.orders.shopperOrder(owner, orderNumber);
  }

  @Get('orders/:orderNumber/invoice')
  @ApiOperation({ summary: 'Get the invoice for an order owned by the current shopper' })
  @ApiOkResponse({ type: OrderResponseDto })
  invoice(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    return this.orders.shopperOrder(owner, orderNumber);
  }

  @Post('orders/:orderNumber/payment-proof')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8_000_000, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Submit an InstaPay receipt for the current shopper order' })
  @ApiOkResponse({ type: OrderResponseDto })
  submitPaymentProof(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderNumber') orderNumber: string,
    @UploadedFile(PaymentProofImageFilePipe) file: Express.Multer.File,
  ): Promise<OrderResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    return this.orders.submitShopperInstaPayProof(owner, orderNumber, file);
  }

  @Get('orders/:orderNumber/payment-proof')
  @ApiOperation({ summary: 'View the current shopper order transfer receipt' })
  async paymentProof(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('orderNumber') orderNumber: string,
  ): Promise<StreamableFile> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const image = await this.orders.shopperPaymentProof(owner, orderNumber);
    response.set({
      'Cache-Control': 'private, no-store',
      'Content-Length': String(image.bytes),
      'Content-Type': image.contentType,
    });
    return new StreamableFile(createReadStream(image.path));
  }
}
