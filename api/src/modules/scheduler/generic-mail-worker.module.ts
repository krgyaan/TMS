import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GenericMailWorker } from "./generic-mail.worker";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [GenericMailWorker],
})
export class GenericMailWorkerModule {}