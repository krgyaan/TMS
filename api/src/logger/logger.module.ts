import { Module, Global } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { winstonLogger } from "./logger.config";
import { AppLogger } from "./app-logger.service";

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: winstonLogger.transports,
      format: winstonLogger.format,
      level: winstonLogger.level,
    }),
  ],
  providers: [AppLogger],
  exports: [WinstonModule, AppLogger],
})
export class LoggerModule {}

export { HttpLoggerMiddleware } from "./http-logger.middleware";
