import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { readCookie } from '../../auth/utils/request.util.js';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface.js';
import type { ShopperOwner } from '../interfaces/shopper-owner.interface.js';

export const GUEST_CART_COOKIE = 'guest_cart';
export const GUEST_WISHLIST_COOKIE = 'guest_wishlist';
export type GuestCookieName = typeof GUEST_CART_COOKIE | typeof GUEST_WISHLIST_COOKIE;

const guestTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

@Injectable()
export class ShopperIdentityService {
  private readonly ttlMilliseconds: number;

  constructor(private readonly configService: ConfigService) {
    this.ttlMilliseconds =
      configService.getOrThrow<number>('GUEST_SESSION_TTL_DAYS') * 24 * 60 * 60 * 1000;
  }

  resolve(
    request: Request,
    response: Response,
    user: AuthenticatedUser | undefined,
    cookieName: GuestCookieName,
    createGuest: boolean,
  ): ShopperOwner {
    const existingToken = readCookie(request, cookieName);
    const token = existingToken && guestTokenPattern.test(existingToken) ? existingToken : null;
    if (user) {
      return {
        userId: user.id,
        ...(token ? { guestTokenHash: this.hash(token) } : {}),
      };
    }
    if (token) {
      if (createGuest) this.setCookie(response, cookieName, token);
      return {
        guestTokenHash: this.hash(token),
        guestExpiresAt: new Date(Date.now() + this.ttlMilliseconds),
      };
    }
    if (!createGuest) return {};

    const issuedToken = randomBytes(32).toString('base64url');
    this.setCookie(response, cookieName, issuedToken);
    return {
      guestTokenHash: this.hash(issuedToken),
      guestExpiresAt: new Date(Date.now() + this.ttlMilliseconds),
    };
  }

  clearMergedGuest(response: Response, cookieName: GuestCookieName): void {
    response.clearCookie(cookieName, { ...this.cookieOptions(), path: '/' });
  }

  private setCookie(response: Response, name: GuestCookieName, token: string): void {
    response.cookie(name, token, {
      ...this.cookieOptions(),
      httpOnly: true,
      maxAge: this.ttlMilliseconds,
      path: '/',
    });
  }

  private cookieOptions() {
    return {
      sameSite: 'lax' as const,
      secure: this.configService.getOrThrow<string>('NODE_ENV') === 'production',
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
