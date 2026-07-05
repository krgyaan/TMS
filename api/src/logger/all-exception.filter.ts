import {
  ExceptionFilter, Catch, HttpException,
  HttpStatus, Inject, type ArgumentsHost
} from "@nestjs/common";
import { Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import * as Sentry from "@sentry/nestjs";

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

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = exception instanceof HttpException
      ? exception.getResponse()
      : { statusCode: status, message: "Internal server error" };

    // Enrich Sentry with request context
    Sentry.withScope((scope) => {
      // Attach user if available (from JWT/session)
      if (request?.user) {
        scope.setUser({
          id: request.user.id,
          email: request.user.email,
          username: request.user.name,
        });
      }

      // Tag for easy filtering in Sentry dashboard
      scope.setTag("http.method", request?.method);
      scope.setTag("http.status_code", status.toString());
      scope.setTag("http.route", request?.route?.path || request?.url);

      // Extra context
      scope.setContext("request", {
        url: request?.url,
        method: request?.method,
        params: request?.params,
        query: request?.query,
        // Don't log body in production for privacy
        body: process.env.NODE_ENV !== "production" ? request?.body : "[redacted]",
      });

      // Set severity
      scope.setLevel(status >= 500 ? "error" : "warning");
    });

    // Winston logs → Loki
    this.logger.error("Unhandled exception", {
      status,
      url: request?.url,
      method: request?.method,
      exceptionMessage: exception instanceof Error ? exception.message : String(exception),
      exceptionStack: exception instanceof Error ? exception.stack : undefined,
      exceptionName: exception instanceof Error ? exception.name : typeof exception,
      userId: request?.user?.id,
    });

    return response.status(status).json(errorResponse);
  }
}