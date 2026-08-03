import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import type { UserRole } from '../../users/interfaces/user-record.interface.js';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

type AuthenticatedRequest = Request & { authenticatedUser?: AuthenticatedUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authenticatedUser || !roles.includes(request.authenticatedUser.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }
}
