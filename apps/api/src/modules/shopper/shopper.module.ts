import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { OptionalJwtAuthenticationGuard } from './guards/optional-jwt-authentication.guard.js';
import { ShopperIdentityService } from './services/shopper-identity.service.js';

@Module({
  imports: [AuthModule],
  providers: [OptionalJwtAuthenticationGuard, ShopperIdentityService],
  exports: [AuthModule, OptionalJwtAuthenticationGuard, ShopperIdentityService],
})
export class ShopperModule {}
