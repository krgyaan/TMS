import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { OpenwaService } from '../../openwa/openwa.service';
import { GROUPS, TEAM_TENDER_GROUPS } from '../../config/groups';
import { openwaConfig } from '../../config/openwa.config';
import { WhatsappJidResolver } from '../notifications/helpers/whatsapp-jid.resolver';
import { PublicLinkService } from '../public-notifications/public-link.service';

export interface TenderInfo {
  id: string;
  title: string;
  deadline: Date;
  description?: string;
}

export interface TenderAllocatedData {
  teamId: number;
  teamMemberId: number;
  teName: string;
  tenderName: string | null;
  tenderNo: string | null;
  dueDate: string;
  tenderValue: string;
  tenderId: number;
}

@Injectable()
export class TenderNotificationService {
  private readonly logger = new Logger(TenderNotificationService.name);

  constructor(
    private readonly openwa: OpenwaService,
    private readonly jidResolver: WhatsappJidResolver,
    @Inject(openwaConfig.KEY) private readonly config: ConfigType<typeof openwaConfig>,
    private readonly publicLink: PublicLinkService,
  ) {}

  /**
   * Notify the allocated team's WhatsApp group when a tender is assigned to a
   * Tender Executive. Only teams mapped in TEAM_TENDER_GROUPS are notified.
   */
  async notifyTenderAllocated(data: TenderAllocatedData): Promise<void> {
    const group = TEAM_TENDER_GROUPS[data.teamId];
    if (!group) {
      this.logger.debug(`No WhatsApp group mapped for team ${data.teamId} — skipping tender allocation notification`);
      return;
    }

    const text = this.formatAllocationMessage(data);

    if (this.config.OPENWA_DRY_RUN) {
      this.logger.log(`[DRY_RUN] Tender allocation WhatsApp notification:\n${text}`);
      return;
    }

    try {
      const jid = await this.jidResolver.toJid(data.teamMemberId);
      await this.openwa.sendText(group, text, jid ? [jid] : undefined);
      if (jid) {
        try {
          await this.openwa.sendText(jid, this.formatAllocationDirectMessage(data));
        } catch (dmError) {
          this.logger.error(`Failed to send tender allocation direct message to user ${data.teamMemberId}: ${dmError instanceof Error ? dmError.message : String(dmError)}`);
        }
      } else {
        this.logger.warn(`User ${data.teamMemberId} has no mobile number — skipping direct WhatsApp message`);
      }
    } catch (error) {
      this.logger.error(`Failed to send tender allocation WhatsApp notification for tender ${data.tenderNo}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private formatAllocationDirectMessage(data: TenderAllocatedData, detailsUrl?: string): string {
    const lines = [
      `Dear ${data.teName},`,
      'Congratulations! A new tender has been assigned to you.',
      `- Tender Name: ${data.tenderName || 'Not specified'}`,
      `- Tender No: ${data.tenderNo || 'Not specified'}`,
      `- Due on: ${data.dueDate}`,
      `- Tender Value: ${data.tenderValue}`,
    ];
    if (detailsUrl) {
      lines.push(`Details: ${detailsUrl}`);
    }
    return lines.join('\n');
  }

  private formatAllocationMessage(data: TenderAllocatedData, detailsUrl?: string): string {
    const lines = [
      `Dear @${data.teName},`,
      'Congratulations! A new tender has been assigned to you.',
      `- Tender Name: ${data.tenderName || 'Not specified'}`,
      `- Tender No: ${data.tenderNo || 'Not specified'}`,
      `- Due on: ${data.dueDate}`,
      `- Tender Value: ${data.tenderValue}`,
    ];
    if (detailsUrl) {
      lines.push(`Details: ${detailsUrl}`);
    }
    return lines.join('\n');
  }

  /** Notify Tendering group about a new tender */
  async notifyNewTender(tender: TenderInfo): Promise<void> {
    const text = this.formatTenderMessage(tender);
    await this.openwa.sendText(GROUPS.TENDERING, text);
  }

  /** Notify with mention to specific user in Tendering group */
  async notifyWithMention(
    userJid: string,
    message: string,
  ): Promise<void> {
    await this.openwa.sendText(GROUPS.TENDERING, message, [userJid]);
  }

  /** Notify Accounts team about payment-related update */
  async notifyPaymentUpdate(
    reference: string,
    amount: number,
    status: 'received' | 'pending' | 'failed',
  ): Promise<void> {
    const emoji = status === 'received' ? '✅' : status === 'pending' ? '⏳' : '❌';
    const text = `${emoji} *Payment ${status.toUpperCase()}*\nRef: ${reference}\nAmount: ${amount}`;
    await this.openwa.sendText(GROUPS.ACCOUNTS_TEAM, text);
  }

  /** Send document to CRM group */
  async sendDocumentToCrm(
    url: string,
    filename: string,
    caption: string,
  ): Promise<void> {
    await this.openwa.sendDocument(GROUPS.CRM, { url, filename, caption });
  }

  /** Send direct message to individual */
  async sendDirectMessage(phoneJid: string, text: string): Promise<void> {
    await this.openwa.sendText(phoneJid, text);
  }

  private formatTenderMessage(tender: TenderInfo): string {
    const lines = [
      '🔔 *New Tender Published*',
      `*Title:* ${tender.title}`,
      `*ID:* ${tender.id}`,
      `*Deadline:* ${tender.deadline.toLocaleDateString('en-GB')}`,
    ];
    if (tender.description) {
      lines.push(`*Description:* ${tender.description}`);
    }
    return lines.join('\n');
  }
}