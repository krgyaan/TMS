import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SafeUser } from '../../master/users/users.service';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SafeUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: SafeUser }>();
    return request.user as SafeUser;
  },
);
