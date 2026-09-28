import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig, { validateAppEnv } from "@/config/app.config";
import authConfig, { validateAuthEnv } from "@/config/auth.config";
import dbConfig, { validateDbEnv } from "@/config/db.config";
import googleConfig, { validateGoogleEnv } from "@/config/google.config";
import redisConfig, { validateRedisEnv } from "@/config/redis.config";
import { GenericMailWorker } from "./generic-mail.worker";
import { LoggerModule } from "@/logger/logger.module";
import { PaymentRequestsNotificationServiceModule } from "@/modules/tendering/payment-requests/payment-requests-notification-service.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
            load: [appConfig, dbConfig, googleConfig, authConfig, redisConfig],
            validate: env => ({
                ...validateAppEnv(env),
                ...validateDbEnv(env),
                ...validateGoogleEnv(env),
                ...validateAuthEnv(env),
                ...validateRedisEnv(env),
            }),
        }),
        LoggerModule,
        PaymentRequestsNotificationServiceModule,
    ],
    providers: [GenericMailWorker],
})
export class GenericMailWorkerModule {}