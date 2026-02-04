import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import * as Sentry from "@sentry/node";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();

        const status = exception instanceof HttpException ? exception.getStatus() : 500;

        Sentry.setContext("request", {
            url: request?.url,
            method: request?.method,
            body: request?.body,
        });

        Sentry.captureException(exception);

        this.logger.error("Unhandled exception", {
            status,
            url: request?.url,
            method: request?.method,
            body: request?.body,
            exception,
        });
    }
}
