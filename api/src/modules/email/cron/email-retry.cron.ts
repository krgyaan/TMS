import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';

@Injectable()
export class EmailRetryCron {
    private readonly logger = new Logger(EmailRetryCron.name);
    private readonly intervalMinutes: number;

    constructor(
        private readonly emailService: EmailService,
        private readonly config: ConfigService,
    ) {
        this.intervalMinutes = this.config.get('EMAIL_RETRY_INTERVAL_MINUTES', 5);
    }

    /**
     * Retry failed emails every 5 minutes (configurable)
     * Using fixed rate instead of cron expression for configurability
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleRetry() {
        this.logger.debug('Running email retry job...');

        try {
            const result = await this.emailService.retryFailedEmails();

            if (result.retried > 0 || result.failed > 0) {
                this.logger.log(`Email retry: ${result.retried} success, ${result.failed} failed`);
            } else {
                this.logger.log('No emails to retry');
            }
        } catch (error) {
            this.logger.error('Email retry job failed:', error instanceof Error ? error.stack : String(error));
        }
    }
}
