import * as dotenv from "dotenv";
dotenv.config();

import { NestFactory } from "@nestjs/core";
import { FollowupWorkerModule } from "./modules/follow-up/followup-worker.module";
import { AccountChecklistWorkerModule } from "./modules/accounts/account-checklist/account-checklist-worker.module";
import { VideoProcessingWorkerModule } from "./modules/hrms/training/worker/video-processing-worker.module";
import { GenericMailWorkerModule } from "./modules/scheduler/generic-mail-worker.module";
import { LeadFollowupWorkerModule } from "./modules/crm/leadfollowup/lead-followup-worker.module";

async function bootstrap() {
    const workers = [
        { name: "Followup", module: FollowupWorkerModule },
        { name: "AccountChecklist", module: AccountChecklistWorkerModule },
        { name: "VideoProcessing", module: VideoProcessingWorkerModule },
        { name: "GenericMail", module: GenericMailWorkerModule },
        { name: "LeadFollowup", module: LeadFollowupWorkerModule },
    ];

    const started: string[] = [];
    const failed: { name: string; error: string }[] = [];

    for (const { name, module } of workers) {
        try {
            await NestFactory.createApplicationContext(module);
            started.push(name);
            console.log(`${name} worker context started`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`${name} worker context FAILED to start: ${message}`);
            failed.push({ name, error: message });
        }
    }

    if (failed.length > 0) {
        console.error("Some workers failed to start:", JSON.stringify(failed, null, 2));
        process.exitCode = 1;
        return;
    }
    console.log("All workers started");
}

void bootstrap();
