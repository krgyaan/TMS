import { Injectable, OnModuleInit } from "@nestjs/common";
import { Worker } from "bullmq";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { PaymentRequestsNotificationService } from "@/modules/tendering/payment-requests/services/payment-requests-notification.service";
import { Inject } from "@nestjs/common";

@Injectable()
export class GenericMailWorker implements OnModuleInit {
    constructor(
        private readonly notificationService: PaymentRequestsNotificationService,
        private readonly configService: ConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger
    ) {}

    onModuleInit() {
        const host = this.configService.get<string>('redis.host');
        const port = this.configService.get<number>('redis.port');

        const worker = new Worker("generic-mail-queue", async job => {
            const { type } = job.data;
            this.logger.info("Processing generic mail job", { jobId: job.id, type });

            switch (type) {
                case 'cheque_due_date':
                    await this.notificationService.processChequeDueDateReminders();
                    break;
                case 'bg_claim_period':
                    await this.notificationService.processBgClaimPeriodReminders();
                    break;
                case 'bg_expiry':
                    await this.notificationService.processBgExpiryReminders();
                    break;
                default:
                    this.logger.warn(`Unknown job type: ${type}`);
                    throw new Error(`Unknown job type: ${type}`);
            }

            this.logger.info("Generic mail job completed", { jobId: job.id, type });
        }, { connection: { host, port }, concurrency: 2 });

        worker.on("failed", (job, err) => {
            this.logger.error("BullMQ generic mail job failed", { jobId: job?.id, error: err.message });
        });

        this.logger.info("Generic Mail worker started and listening to generic-mail-queue");
    }
}
