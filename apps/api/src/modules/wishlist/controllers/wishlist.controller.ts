import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  GUEST_WISHLIST_COOKIE,
  ShopperIdentityService,
} from '../../shopper/services/shopper-identity.service.js';
import { AddWishlistItemDto, WishlistResponseDto } from '../dto/wishlist.dto.js';
import { WishlistService } from '../services/wishlist.service.js';

@ApiTags('Wishlist')
@Public()
@UseGuards(OptionalJwtAuthenticationGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly service: WishlistService,
    private readonly identity: ShopperIdentityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the current guest or customer wishlist' })
  @ApiOkResponse({ type: WishlistResponseDto })
  async get(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WishlistResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_WISHLIST_COOKIE, false);
    const wishlist = await this.service.get(owner);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return wishlist;
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save an active product to the wishlist' })
  @ApiOkResponse({ type: WishlistResponseDto })
  async add(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() input: AddWishlistItemDto,
  ): Promise<WishlistResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_WISHLIST_COOKIE, true);
    const wishlist = await this.service.add(owner, input);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return wishlist;
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  @ApiOkResponse({ type: WishlistResponseDto })
  async remove(
    @OptionalCurrentUser() user: AuthenticatedUser | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<WishlistResponseDto> {
    const owner = this.identity.resolve(request, response, user, GUEST_WISHLIST_COOKIE, false);
    const wishlist = await this.service.remove(owner, productId);
    this.clearMergedCookie(response, user, owner.guestTokenHash);
    return wishlist;
  }

  private clearMergedCookie(
    response: Response,
    user: AuthenticatedUser | undefined,
    guestTokenHash: string | undefined,
  ): void {
    if (user && guestTokenHash) this.identity.clearMergedGuest(response, GUEST_WISHLIST_COOKIE);
  }
}
