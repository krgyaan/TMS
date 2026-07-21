import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig, { validateAppEnv } from "@/config/app.config";
import authConfig, { validateAuthEnv } from "@/config/auth.config";
import dbConfig, { validateDbEnv } from "@/config/db.config";
import googleConfig, { validateGoogleEnv } from "@/config/google.config";
import redisConfig, { validateRedisEnv } from "@/config/redis.config";
import { DatabaseModule } from "@/db/database.module";
import { TrainingModule } from "../training.module";
import { VideoProcessingWorker } from "./video-processing.worker";
import { LoggerModule } from "@/logger/logger.module";

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
        DatabaseModule,
        LoggerModule,
        TrainingModule,
    ],
    providers: [VideoProcessingWorker],
})
export class VideoProcessingWorkerModule {}
