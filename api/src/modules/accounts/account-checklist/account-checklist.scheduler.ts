import { Injectable, Inject } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { AccountChecklistService } from "./account-checklist.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Injectable()
export class AccountChecklistScheduler {
    constructor(
        @Inject("CHECKLIST_QUEUE")
        private readonly queue: Queue,
        private readonly service: AccountChecklistService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    // app:generate-checklist-tasks — daily 01:00
    @Cron("0 1 * * *")
    async handleGenerateTasks() {
        this.logger.info("Cron tick at generateChecklistTasks", { timestamp: new Date() });
        try {
            await this.service.generateChecklistTasks();
            this.logger.info("Successfully generated checklist tasks");
        } catch (error: any) {
            this.logger.error("Error generating checklist tasks", { error: error.message });
        }
    }

    // app:send-eod-checklist-mail — Mon–Fri 20:10
    @Cron("28 19 * * 1-5")
    async handleEodMails() {
        this.logger.info("Cron tick at enqueueEodMails", { timestamp: new Date() });
        try {
            await this.service.enqueueEodMails(this.queue);
            this.logger.info("Successfully enqueued EOD checklist mails");
        } catch (error: any) {
            this.logger.error("Error enqueueing EOD checklist mails", { error: error.message });
        }
    }
}
