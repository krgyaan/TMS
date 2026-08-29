import { Injectable } from '@nestjs/common';
import { OpenwaService } from '../../openwa/openwa.service';
import { GROUPS } from '../../config/groups';

export interface TenderInfo {
  id: string;
  title: string;
  deadline: Date;
  description?: string;
}

@Injectable()
export class TenderNotificationService {
  constructor(private readonly openwa: OpenwaService) {}

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