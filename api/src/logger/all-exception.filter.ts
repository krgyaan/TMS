import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Inject } from "@nestjs/common";
import { Response } from "express";
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

        // 🔹 Logging (unchanged)
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

        // ✅ THIS IS THE MISSING PIECE
        return response.status(status).json(errorResponse);
    }
}
