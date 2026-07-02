import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { FollowupWorkerModule } from "./modules/follow-up/followup-worker.module";
import { AccountChecklistWorkerModule } from "./modules/accounts/account-checklist/account-checklist-worker.module";
import { VideoProcessingWorkerModule } from "./modules/hrms/training/worker/video-processing-worker.module"

async function bootstrap() {
    await NestFactory.createApplicationContext(FollowupWorkerModule);
    await NestFactory.createApplicationContext(AccountChecklistWorkerModule);
    await NestFactory.createApplicationContext(VideoProcessingWorkerModule);
    console.log("✅ Workers started");
}
bootstrap();

