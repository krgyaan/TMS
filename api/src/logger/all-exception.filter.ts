import { ExceptionFilter, Catch, HttpException, HttpStatus, Inject, type ArgumentsHost } from "@nestjs/common";
import { Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { SentryExceptionCaptured } from "@sentry/nestjs";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    @SentryExceptionCaptured()
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : {
                      statusCode: status,
                      message: "Internal server error",
                  };

        this.logger.error("Unhandled exception", {
            status,
            url: request?.url,
            method: request?.method,
            body: request?.body,
            exceptionMessage: exception instanceof Error ? exception.message : String(exception),
            exceptionStack: exception instanceof Error ? exception.stack : undefined,
            exceptionName: exception instanceof Error ? exception.name : typeof exception,
        });

        return response.status(status).json(errorResponse);
    }
}
