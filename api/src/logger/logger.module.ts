import { Module, Global } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { winstonLogger } from "./logger.config";

@Global()
@Module({
    imports: [
        WinstonModule.forRoot({
            transports: winstonLogger.transports,
            format: winstonLogger.format,
            level: winstonLogger.level,
        }),
    ],
    exports: [WinstonModule],
})
export class LoggerModule {}
