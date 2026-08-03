import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller.js';
import { validateEnvironment } from './config/environment.js';
import { PrismaModule } from './database/prisma/prisma.module.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BrandsModule } from './modules/brands/brands.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { CheckoutModule } from './modules/checkout/checkout.module.js';
import { ContactModule } from './modules/contact/contact.module.js';
import { CouponsModule } from './modules/coupons/coupons.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ShippingModule } from './modules/shipping/shipping.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WishlistModule } from './modules/wishlist/wishlist.module.js';

const requestIdPattern = /^[a-zA-Z0-9._-]{1,80}$/;

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.getOrThrow<string>('LOG_LEVEL'),
          autoLogging: {
            ignore: (request) => request.url === '/api/v1/health/live',
          },
          genReqId: (request, response) => {
            const header = request.headers['x-request-id'];
            const requestedId = Array.isArray(header) ? header[0] : header;
            const id =
              typeof requestedId === 'string' && requestIdPattern.test(requestedId)
                ? requestedId
                : randomUUID();

            response.setHeader('x-request-id', id);
            return id;
          },
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers.set-cookie',
              'req.body.password',
              'req.body.passwordConfirmation',
              'req.body.token',
            ],
            remove: true,
          },
          transport:
            configService.getOrThrow<string>('NODE_ENV') === 'development'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
          limit: configService.getOrThrow<number>('RATE_LIMIT_LIMIT'),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    AnalyticsModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    WishlistModule,
    CouponsModule,
    ShippingModule,
    SettingsModule,
    OrdersModule,
    CheckoutModule,
    ContactModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
