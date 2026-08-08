import {
  ExceptionFilter, Catch, HttpException,
  HttpStatus, Inject, type ArgumentsHost
} from "@nestjs/common";
import { Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import * as Sentry from "@sentry/nestjs";

const PG_ERROR_MAP: Record<string, { status: number; message: string }> = {
  '23505': { status: HttpStatus.CONFLICT, message: 'A record with this value already exists' },
  '23503': { status: HttpStatus.BAD_REQUEST, message: 'Referenced record not found' },
  '23502': { status: HttpStatus.BAD_REQUEST, message: 'A required field is missing' },
  '22P02': { status: HttpStatus.BAD_REQUEST, message: 'Invalid value format' },
};

function extractPgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const error = err as Record<string, unknown>;
  if (typeof error.code === 'string' && /^\d{5}$/.test(error.code)) {
    return error.code;
  }
  if (error.cause) return extractPgCode(error.cause);
  return undefined;
}

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

    let status: number;
    let errorResponse: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorResponse = exception.getResponse() as Record<string, unknown>;
      // nestjs-zod validation failures expose raw zod issues under `errors`
      if (Array.isArray(errorResponse.errors) && !errorResponse.issues) {
        errorResponse.issues = errorResponse.errors;
      }
    } else {
      const pgCode = extractPgCode(exception);
      const pgMapping = pgCode ? PG_ERROR_MAP[pgCode] : undefined;
      if (pgMapping) {
        status = pgMapping.status;
        errorResponse = { statusCode: status, message: pgMapping.message, pgCode };
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorResponse = { statusCode: status, message: "Internal server error" };
      }
    }

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