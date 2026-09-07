import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../db/database.module';
import type { DbInstance } from '../../db';
import { users } from '../../db/schemas/';
import { OpenwaService } from '../../openwa/openwa.service';
import { GROUPS } from '../../config/groups';
import { openwaConfig } from '../../config/openwa.config';
import type { ConfigType } from '@nestjs/config';
import { WhatsappJidResolver } from '../notifications/helpers/whatsapp-jid.resolver';

export interface PaymentRequestNotificationData {
  requestNo: string;
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  requestedBy: number;
  category: string;
}

export interface PaymentDoneNotificationData {
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  utrNumber: string | null;
  requestedBy: number;
  category: string;
}

export interface RejectionNotificationData {
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  rejectionReason: string | null;
  requestedBy: number;
  category: string;
}

export interface MakerDoneNotificationData {
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  requestedBy: number;
  category: string;
}

@Injectable()
export class OperationNotificationService {
  private readonly logger = new Logger(OperationNotificationService.name);

  private readonly OPEN_CATEGORIES = new Set([
    'imprest', 'communication', 'courier', 'insurance', 'software',
    'office_expenses', 'printing_stationary', 'office_maintenance',
    'portal_renewal_charges', 'professional_charges', 'od_ac_interest',
    'asset_purchase', 'po', 'vwo', 'others', 'gem_charges',
  ]);

  private readonly USER_RESTRICTED_CATEGORIES: Record<string, number[]> = {
    salary: [7, 21, 26],
    related_party: [7, 21, 26],
    investment: [7, 21, 26],
  };

  private readonly TEAM5_CATEGORIES = new Set([
    'electricity', 'rent', 'emi', 'nbfc_oc_acc', 'loan_principal_return',
    'AU_5242', 'AU_5180', 'AU_5190', 'AU_8316', 'AU_9589', 'AU_9284',
    'amex_cc', 'YES_BANK_2011', 'YES_BANK_0771',
  ]);

  constructor(
    private readonly openwa: OpenwaService,
    @Inject(DRIZZLE) private readonly db: DbInstance,
    @Inject(openwaConfig.KEY) private readonly config: ConfigType<typeof openwaConfig>,
    private readonly jidResolver: WhatsappJidResolver,
  ) {}

  private resolveTargets(category: string): { type: 'group'; group: string } | { type: 'users'; userIds: number[] } | { type: 'accounts_group' } | null {
    if (this.OPEN_CATEGORIES.has(category)) {
      return { type: 'group', group: GROUPS.PAYMENTS };
    }
    const userIds = this.USER_RESTRICTED_CATEGORIES[category];
    if (userIds) {
      return { type: 'users', userIds };
    }
    if (this.TEAM5_CATEGORIES.has(category)) {
      return { type: 'accounts_group' };
    }
    return null;
  }

  private async sendToTargets(text: string, target: { type: 'group'; group: string } | { type: 'users'; userIds: number[] } | { type: 'accounts_group' }): Promise<void> {
    if (this.config.OPENWA_DRY_RUN) {
      this.logger.log(`[DRY_RUN] WhatsApp notification:\n${text}`);
      return;
    }

    switch (target.type) {
      case 'group': {
        await this.openwa.sendText(target.group, text);
        break;
      }
      case 'users': {
        const jidPromises = target.userIds.map(id => this.jidResolver.toJid(id));
        const jids = (await Promise.all(jidPromises)).filter((jid): jid is string => jid !== null);
        await Promise.all(jids.map(jid => this.openwa.sendText(jid, text)));
        break;
      }
      case 'accounts_group': {
        this.logger.log(`[ACCOUNTS_GROUP] Notification (not sent - no JID configured):\n${text}`);
        break;
      }
    }
  }

  private async buildText(
    header: string,
    data: { amount: string | number; partyName: string | null; portalLink: string | null; utrNumber?: string | null; rejectionReason?: string | null },
    userName: string,
    isPaymentDone: boolean = false,
    isRejection: boolean = false,
  ): Promise<string> {
    const lines: string[] = [];

    if (isPaymentDone) {
      lines.push(`*Payment Done* @${userName}`);
    } else if (isRejection) {
      lines.push(`*Maker Rejected* @${userName}`);
    } else if (header === 'Maker Done') {
      lines.push(`*Maker Done* @${userName}`);
    } else {
      lines.push(header);
    }

    lines.push(`Amount: ₹${data.amount}`);
    lines.push(`Party: ${data.partyName || data.portalLink || 'N/A'}`);

    if (isPaymentDone && data.utrNumber) {
      lines.push(`UTR: ${data.utrNumber}`);
    }

    if (isRejection && data.rejectionReason) {
      lines.push(`Reason: ${data.rejectionReason}`);
    }

    if (header === 'New Payment Request') {
      lines.push(`Requested by: ${userName}`);
    }

    return lines.join('\n');
  }

  async notifyNewPaymentRequest(data: PaymentRequestNotificationData): Promise<void> {
    try {
      const target = this.resolveTargets(data.category);
      if (!target) {
        this.logger.warn(`No notification target for category: ${data.category}`);
        return;
      }

      if (target.type === 'accounts_group') {
        this.logger.log(`[SKIP] Accounts group notification not sent (no JID configured): category=${data.category}`);
        return;
      }

      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.requestedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const text = await this.buildText('*New Payment Request*', {
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
      }, userName);

      await this.sendToTargets(text, target);
    } catch (err) {
      this.logger.warn(`Failed to send payment request notification: ${err}`);
    }
  }

  async notifyPaymentDone(data: PaymentDoneNotificationData): Promise<void> {
    try {
      const target = this.resolveTargets(data.category);
      if (!target) {
        this.logger.warn(`No notification target for category: ${data.category}`);
        return;
      }

      if (target.type === 'accounts_group') {
        this.logger.log(`[SKIP] Accounts group notification not sent (no JID configured): category=${data.category}`);
        return;
      }

      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.requestedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const text = await this.buildText('Payment Done', {
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
        utrNumber: data.utrNumber,
      }, userName, true);

      await this.sendToTargets(text, target);
    } catch (err) {
      this.logger.warn(`Failed to send payment done notification: ${err}`);
    }
  }

  async notifyRejection(data: RejectionNotificationData): Promise<void> {
    try {
      const target = this.resolveTargets(data.category);
      if (!target) {
        this.logger.warn(`No notification target for category: ${data.category}`);
        return;
      }

      if (target.type === 'accounts_group') {
        this.logger.log(`[SKIP] Accounts group notification not sent (no JID configured): category=${data.category}`);
        return;
      }

      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.requestedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const text = await this.buildText('Rejection', {
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
        rejectionReason: data.rejectionReason,
      }, userName, false, true);

      await this.sendToTargets(text, target);
    } catch (err) {
      this.logger.warn(`Failed to send rejection notification: ${err}`);
    }
  }

  async notifyMakerDone(data: MakerDoneNotificationData): Promise<void> {
    try {
      const target = this.resolveTargets(data.category);
      if (!target) {
        this.logger.warn(`No notification target for category: ${data.category}`);
        return;
      }

      if (target.type === 'accounts_group') {
        this.logger.log(`[SKIP] Accounts group notification not sent (no JID configured): category=${data.category}`);
        return;
      }

      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.requestedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const text = await this.buildText('Maker Done', {
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
      }, userName);

      await this.sendToTargets(text, target);
    } catch (err) {
      this.logger.warn(`Failed to send maker done notification: ${err}`);
    }
  }
}