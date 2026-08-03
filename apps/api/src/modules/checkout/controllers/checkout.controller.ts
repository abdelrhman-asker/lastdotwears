import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { OrderResponseDto } from '../../orders/dto/order.dto.js';
import {
  GUEST_CART_COOKIE,
  ShopperIdentityService,
} from '../../shopper/services/shopper-identity.service.js';
import { CheckoutQuoteDto, CheckoutQuoteResponseDto, PlaceOrderDto } from '../dto/checkout.dto.js';
import { CheckoutService } from '../services/checkout.service.js';

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly service: CheckoutService,
    private readonly identity: ShopperIdentityService,
  ) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recalculate cart, coupon, shipping, and total server-side' })
  @ApiOkResponse({ type: CheckoutQuoteResponseDto })
  async quote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: CheckoutQuoteDto,
  ): Promise<CheckoutQuoteResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const quote = await this.service.quote(user, owner, input);
    if (owner.guestTokenHash) this.identity.clearMergedGuest(response, GUEST_CART_COOKIE);
    return quote;
  }

  @Post('orders')
  @HttpCode(200)
  @ApiOperation({ summary: 'Place an idempotent COD or manual InstaPay order' })
  @ApiOkResponse({ type: OrderResponseDto })
  async place(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: PlaceOrderDto,
  ): Promise<OrderResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const order = await this.service.place(user, owner, input);
    if (owner.guestTokenHash) this.identity.clearMergedGuest(response, GUEST_CART_COOKIE);
    return order;
  }
}
