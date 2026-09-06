import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { DbInstance } from '../../db';
import { users } from '../../db/schemas/';
import { OpenwaService } from '../../openwa/openwa.service';
import { GROUPS } from '../../config/groups';
import { openwaConfig } from '../../config/openwa.config';
import type { ConfigType } from '@nestjs/config';

export interface PaymentRequestNotificationData {
  requestNo: string;
  amount: string | number;
  partyName: string;
  requestedBy: number;
}

@Injectable()
export class OperationNotificationService {
  private readonly logger = new Logger(OperationNotificationService.name);

  constructor(
    private readonly openwa: OpenwaService,
    @Inject(DRIZZLE) private readonly db: DbInstance,
    @Inject(openwaConfig.KEY) private readonly config: ConfigType<typeof openwaConfig>,
  ) {}

  async notifyNewPaymentRequest(data: PaymentRequestNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.requestedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const text = [
        '*New Payment Request*',
        `Request: ${data.requestNo}`,
        `Amount: ₹${data.amount}`,
        `Party: ${data.partyName}`,
        `Requested by: ${userName}`,
      ].join('\n');

      if (this.config.OPENWA_DRY_RUN) {
        this.logger.log(`[DRY_RUN] WhatsApp notification to ${GROUPS.PAYMENTS}:\n${text}`);
        return;
      }

      await this.openwa.sendText(GROUPS.PAYMENTS, text);
    } catch (err) {
      this.logger.warn(`Failed to send payment request notification: ${err}`);
    }
  }
}