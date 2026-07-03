import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GenericMailWorker } from "./generic-mail.worker";
import { LoggerModule } from "@/logger/logger.module";
import { PaymentRequestsModule } from "@/modules/tendering/payment-requests/payment-requests.module";

@Module({
    imports: [ConfigModule, LoggerModule, PaymentRequestsModule],
    providers: [GenericMailWorker],
})
export class GenericMailWorkerModule {}