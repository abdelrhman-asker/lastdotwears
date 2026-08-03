import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { GUEST_CART_COOKIE, ShopperIdentityService } from './shopper-identity.service.js';

describe('ShopperIdentityService', () => {
  it('issues a hardened opaque guest cookie and stores only its hash in the owner context', () => {
    let cookieName = '';
    let cookieValue = '';
    let cookieOptions: Record<string, unknown> = {};
    const config = {
      getOrThrow: (key: string) => (key === 'GUEST_SESSION_TTL_DAYS' ? 90 : 'production'),
    } as unknown as ConfigService;
    const response = {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookieName = name;
        cookieValue = value;
        cookieOptions = options;
      },
    } as unknown as Response;

    const owner = new ShopperIdentityService(config).resolve(
      { headers: {} } as Request,
      response,
      undefined,
      GUEST_CART_COOKIE,
      true,
    );

    expect(cookieName).toBe('guest_cart');
    expect(cookieValue).toHaveLength(43);
    expect(owner.guestTokenHash).toHaveLength(64);
    expect(owner.guestTokenHash).not.toBe(cookieValue);
    expect(cookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
  });
});
