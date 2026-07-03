import { Request, Response, NextFunction } from "express";
import { requestContext } from "./request-context";
import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const store = requestContext.getStore();
    if (store) {
      store.method = req.method;
      store.url = req.originalUrl;
      store.startTime = Date.now();
    }

    this.logger.http("incoming request", {
      method: req.method,
      url: req.originalUrl,
    });

    res.on("finish", () => {
      const duration = store?.startTime ? Date.now() - store.startTime : 0;
      this.logger.http("outgoing response", {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  }
}