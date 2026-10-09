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
    const normalizeMeta = (meta?: unknown) => {
      if (!meta) return { context };
      if (typeof meta === 'string') return { context, stack: meta };
      if (meta instanceof Error) return { context, error: meta.message, stack: meta.stack };
      if (typeof meta === 'object' && meta !== null) return { context, ...meta };
      return { context, meta };
    };

    return {
      log: (message: string, meta?: unknown) =>
        this.logger.info(message, normalizeMeta(meta)),

      info: (message: string, meta?: unknown) =>
        this.logger.info(message, normalizeMeta(meta)),

      error: (message: string, meta?: unknown) =>
        this.logger.error(message, normalizeMeta(meta)),

      warn: (message: string, meta?: unknown) =>
        this.logger.warn(message, normalizeMeta(meta)),

      debug: (message: string, meta?: unknown) =>
        this.logger.debug(message, normalizeMeta(meta)),
    };
  }

  log(message: string, meta?: unknown) {
    this.logger.info(message, meta);
  }

  info(message: string, meta?: unknown) {
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