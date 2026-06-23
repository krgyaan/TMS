import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@/db/database.module";
import { TrainingModule } from "../training.module";
import { VideoProcessingWorker } from "./video-processing.worker";
import { LoggerModule } from "@/logger/logger.module";

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        LoggerModule,
        TrainingModule,
    ],
    providers: [VideoProcessingWorker],
})
export class VideoProcessingWorkerModule {}
