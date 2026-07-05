import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger as WinstonLogger } from "winston";

@Injectable()
export class AppLogger {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  withContext(context: string) {
    return {
      log: (message: string, meta?: Record<string, unknown>) =>
        this.logger.info(message, { context, ...meta }),

      error: (message: string, meta?: Record<string, unknown>) =>
        this.logger.error(message, { context, ...meta }),

      warn: (message: string, meta?: Record<string, unknown>) =>
        this.logger.warn(message, { context, ...meta }),

      debug: (message: string, meta?: Record<string, unknown>) =>
        this.logger.debug(message, { context, ...meta }),
    };
  }

  log(message: string, meta?: unknown) {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: unknown) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: unknown) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: unknown) {
    this.logger.debug(message, meta);
  }
}