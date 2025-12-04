import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ValidatedUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
    (data: keyof ValidatedUser | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<Request & { user?: ValidatedUser }>();
        const user = request.user;

        if (data && user) {
            return user[data];
        }

        return user;
    },
);
