import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface.js';

type OptionallyAuthenticatedRequest = Request & { authenticatedUser?: AuthenticatedUser };

export const OptionalCurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<OptionallyAuthenticatedRequest>().authenticatedUser,
);
