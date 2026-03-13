import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export const ValidatedBody = (schema: ZodSchema) =>
    createParamDecorator((data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const body = request.body;

        const result = schema.safeParse(body);

        if (!result.success) {
            const formattedErrors = result.error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
                expected: 'expected' in err ? err.expected : undefined,
                received: 'received' in err ? err.received : undefined,
            }));

            throw new BadRequestException({
                message: 'Validation failed',
                errors: formattedErrors,
            });
        }

        return result.data;
    })();
