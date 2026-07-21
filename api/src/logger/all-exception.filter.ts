import {
  ExceptionFilter, Catch, HttpException,
  HttpStatus, Inject, type ArgumentsHost
} from "@nestjs/common";
import { Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import * as Sentry from "@sentry/nestjs";

function extractErrorChain(err: unknown, depth = 0): Record<string, unknown> {
  if (depth > 5 || !(err instanceof Error)) return {};
  const result: Record<string, unknown> = {
    name: err.name,
    message: err.message,
  };
  if (err.stack) result.stack = err.stack;
  if ((err as any).cause) {
    result.cause = extractErrorChain((err as any).cause, depth + 1);
  }
  return result;
}

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

    const errorChain = extractErrorChain(exception);

    // Enrich Sentry with request context + full error chain
    Sentry.withScope((scope) => {
      if (request?.user) {
        scope.setUser({
          id: request.user.id,
          email: request.user.email,
          username: request.user.name,
        });
      }

      scope.setTag("http.method", request?.method);
      scope.setTag("http.status_code", status.toString());
      scope.setTag("http.route", request?.route?.path || request?.url);

      scope.setContext("request", {
        url: request?.url,
        method: request?.method,
        params: request?.params,
        query: request?.query,
        body: process.env.NODE_ENV !== "production" ? request?.body : "[redacted]",
      });

      if (errorChain.cause) {
        scope.setContext("error_cause", errorChain.cause as Record<string, unknown>);
      }

      scope.setLevel(status >= 500 ? "error" : "warning");
    });

    // Winston logs → Loki
    this.logger.error("Unhandled exception", {
      status,
      url: request?.url,
      method: request?.method,
      exceptionName: errorChain.name,
      exceptionMessage: errorChain.message,
      exceptionStack: errorChain.stack,
      exceptionCause: errorChain.cause,
      userId: request?.user?.id,
    });

    return response.status(status).json(errorResponse);
  }
}