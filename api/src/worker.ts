import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { FollowupWorkerModule } from "./modules/follow-up/followup-worker.module";

async function bootstrap() {
    await NestFactory.createApplicationContext(FollowupWorkerModule);
    console.log("✅ Followup worker started");
}
bootstrap();
