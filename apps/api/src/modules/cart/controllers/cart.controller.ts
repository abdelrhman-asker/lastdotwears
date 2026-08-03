import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { OptionalCurrentUser } from '../../../common/decorators/optional-current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import { OptionalJwtAuthenticationGuard } from '../../shopper/guards/optional-jwt-authentication.guard.js';
import {
  GUEST_CART_COOKIE,
  ShopperIdentityService,
} from '../../shopper/services/shopper-identity.service.js';
import { AddCartItemDto, CartResponseDto, UpdateCartItemDto } from '../dto/cart.dto.js';
import { CartService } from '../services/cart.service.js';

@ApiTags('Shopping Cart')
@Public()
@UseGuards(OptionalJwtAuthenticationGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly service: CartService,
    private readonly identity: ShopperIdentityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the current guest or customer cart and current pricing' })
  @ApiOkResponse({ type: CartResponseDto })
  async get(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CartResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const cart = await this.service.get(owner);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return cart;
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a live product variant to the cart' })
  @ApiOkResponse({ type: CartResponseDto })
  async add(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: AddCartItemDto,
  ): Promise<CartResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, true);
    const cart = await this.service.add(owner, input);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return cart;
  }

  @Patch('items/:variantId')
  @ApiOkResponse({ type: CartResponseDto })
  async update(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() input: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const cart = await this.service.update(owner, variantId, input);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return cart;
  }

  @Delete('items/:variantId')
  @ApiOkResponse({ type: CartResponseDto })
  async remove(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<CartResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const cart = await this.service.remove(owner, variantId);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return cart;
  }

  @Delete('items')
  @ApiOperation({ summary: 'Clear every item from the current cart' })
  @ApiOkResponse({ type: CartResponseDto })
  async clear(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CartResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_CART_COOKIE, false);
    const cart = await this.service.clear(owner);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return cart;
  }

  private clearMergedCookie(
    response: Response,
    user: AuthenticatedUser | undefined,
    guestTokenHash: string | undefined,
  ): void {
    if (user && guestTokenHash) this.identity.clearMergedGuest(response, GUEST_CART_COOKIE);
  }
}
