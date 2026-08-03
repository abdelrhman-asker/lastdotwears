import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface.js';

type RequestWithAuthenticatedUser = Request & {
  authenticatedUser?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithAuthenticatedUser>();

    if (!request.authenticatedUser) {
      throw new Error('CurrentUser was used without an authenticated request.');
    }

    return request.authenticatedUser;
  },
);
