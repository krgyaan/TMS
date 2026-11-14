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
import { PublicLinkService } from '../public-notifications/public-link.service';

export interface PaymentRequestNotificationData {
  requestNo: string;
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  requestedBy: number;
  category: string;
}

export interface PaymentDoneNotificationData {
  requestNo?: string;
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  utrNumber: string | null;
  requestedBy: number;
  category: string;
}

export interface RejectionNotificationData {
  requestNo?: string;
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  rejectionReason: string | null;
  requestedBy: number;
  category: string;
}

export interface MakerDoneNotificationData {
  requestNo?: string;
  amount: string | number;
  partyName: string | null;
  portalLink: string | null;
  requestedBy: number;
  category: string;
}

export interface PoCreatedNotificationData {
  poNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  projectName: string | null;
  createdBy: number;
}

export interface PoApprovalNotificationData {
  poNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  tdsPercentage: string | null;
  amountAfterTds: string | null;
  approvedBy: number;
}

export interface PoRejectedNotificationData {
  poNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  remark: string | null;
  rejectedBy: number;
}

export interface PoUpdatedNotificationData {
  poNumber: string;
  sellerName: string | null;
  updatedBy: number;
}

export interface VwoCreatedNotificationData {
  woNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  projectName: string | null;
  createdBy: number;
}

export interface VwoApprovalNotificationData {
  woNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  tdsPercentage: string | null;
  amountAfterTds: string | null;
  approvedBy: number;
}

export interface VwoRejectedNotificationData {
  woNumber: string;
  sellerName: string | null;
  grandTotal: string | number;
  remark: string | null;
  rejectedBy: number;
}

export interface VwoUpdatedNotificationData {
  woNumber: string;
  sellerName: string | null;
  updatedBy: number;
}

export interface WoBasicDetailsCreatedData {
  woBasicDetailId: number;
  organizationName: string | null;
  projectName: string | null;
  projectCode: string | null;
  woValuePreGst: string | null;
  actorName?: string | null;
  teamMemberName?: string | null;
}

export interface WoBasicDetailsUpdatedData extends WoBasicDetailsCreatedData {}

export interface WoBasicDetailsRevisedData extends WoBasicDetailsCreatedData {
  revisionNumber: number;
  revisionNotes?: string | null;
}

@Injectable()
export class OperationNotificationService {
  private readonly logger = new Logger(OperationNotificationService.name);

  private readonly OPEN_CATEGORIES = new Set([
    'imprest', 'communication', 'courier', 'insurance', 'software',
    'office_expenses', 'printing_stationary', 'office_maintenance',
    'portal_renewal_charges', 'professional_charges', 'od_ac_interest',
    'asset_purchase', 'po', 'vwo', 'others', 'gem_charges',
    'registration_charges', 'pop_charges', 'bank_charges', 'diwali_gift_expenses',
    'inventory_purchase', 'dd', 'bt', 'pop', 'bg', 'sb', 'fdr',
    'sd_vendor', 'sd_landlord', 'emd', 'EMD', 'Tender Fee', 'Processing Fee',
  ]);

  private readonly CATEGORY_LABELS: Record<string, string> = {
    upload_invoice: 'Upload Invoice',
    new_pi: 'New PI',
    po: 'PO',
    vwo: 'Work Order (V)',
    others: 'Imprest',
    imprest: 'Imprest',
    fixed: 'Fixed',
    loan_return: 'Loan Repayment/Return',
    own_bank: 'Own Bank',
    capital_asset_purchase: 'Capital/Asset Purchase',
    communication: 'Communication',
    courier: 'Courier',
    electricity: 'Electricity',
    rent: 'Rent',
    emi: 'EMI',
    salary: 'Salary',
    software: 'Software',
    office_expenses: 'Office Expenses',
    od_ac_interest: 'OD A/C Interest',
    printing_stationary: 'Printing & Stationary',
    office_maintenance: 'Office Maintenance',
    related_party: 'Related Party',
    nbfc_oc_acc: 'NBFC OC Account',
    nbfc_od_acc: 'NBFC OD Account',
    loan_principal_return: 'Loan Principal Return',
    AU_5242: 'AU Current Account (AU_5242)',
    AU_5180: 'AU Inflow Account (AU_5180)',
    AU_5190: 'AU Expenses Account (AU_5190)',
    AU_8316: 'AU Outflow Account (AU_8316)',
    AU_9589: 'AU EMD Account (AU_9589)',
    AU_9284: 'AU Cash Reserve Account (AU_9284)',
    amex_cc: 'Amex Company Credit Card',
    investment: 'Investment',
    asset_purchase: 'Asset Purchase',
    portal_renewal_charges: 'Portal Renewal Charges',
    professional_charges: 'Professional Charges',
    insurance: 'Insurance',
    YES_BANK_2011: 'Yes Bank Inflow Account (2011)',
    YES_BANK_0771: 'Yes Bank (0771)',
    inventory_purchase: 'Inventory Purchase',
    gem_charges: 'GeM Charges',
    registration_charges: 'Registration Charges',
    pop_charges: 'POP Charges',
    bank_charges: 'Bank Charges',
    cc_ac_interest: 'CC A/C Interest',
    esi: 'ESI',
    pf: 'PF',
    gst: 'GST',
    tds: 'TDS',
    income_tax: 'Income Tax',
    diwali_gift_expenses: 'Diwali/Gift Expenses',
    dd: 'Demand Draft',
    bt: 'Bank Transfer',
    pop: 'Pay On Portal',
    bg: 'Bank Guarantee',
    sb: 'Surity Bond',
    fdr: 'Fixed Deposit Receipt',
    sd_vendor: 'Security Deposit - Vendor',
    sd_landlord: 'Security Deposit - Landlord',
    emd: 'EMD',
    EMD: 'EMD',
    'Tender Fee': 'Tender Fee',
    'Processing Fee': 'Processing Fee',
  };

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
    private readonly publicLink: PublicLinkService,
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

  private labelForCategory(category: string): string {
    const label = this.CATEGORY_LABELS[category];
    if (label) {
      return label;
    }
    if (!category) {
      return 'N/A';
    }
    return category
      .split('_')
      .map(word => (word === word.toUpperCase() && word.length > 1 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ');
  }

  private async buildText(
    header: string,
    data: { amount: string | number; partyName: string | null; portalLink: string | null; category: string; requestNo?: string; utrNumber?: string | null; rejectionReason?: string | null },
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

    lines.push(`Request: ${data.requestNo || 'N/A'}`);
    lines.push(`Amount: ₹${data.amount}`);
    lines.push(`Party: ${data.partyName || data.portalLink || 'N/A'}`);
    lines.push(`Category: ${this.labelForCategory(data.category)}`);

    if (isPaymentDone && data.utrNumber) {
      lines.push(`UTR: ${data.utrNumber}`);
    }

    if (isRejection && data.rejectionReason) {
      lines.push(`Reason: ${data.rejectionReason}`);
    }

    if (header === '*New Payment Request*') {
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
        category: data.category,
        requestNo: data.requestNo,
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
        requestNo: data.requestNo,
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
        category: data.category,
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
        requestNo: data.requestNo,
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
        category: data.category,
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
        requestNo: data.requestNo,
        amount: data.amount,
        partyName: data.partyName,
        portalLink: data.portalLink,
        category: data.category,
      }, userName);

      await this.sendToTargets(text, target);
    } catch (err) {
      this.logger.warn(`Failed to send maker done notification: ${err}`);
    }
  }

  async notifyPoApproved(data: PoApprovalNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.approvedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*PO Approved* @${userName}`,
        `PO No: ${data.poNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `After TDS (${data.tdsPercentage || '0'}%): ₹${data.amountAfterTds || 'N/A'}`,
        `Party: ${data.sellerName || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send PO approval notification: ${err}`);
    }
  }

  async notifyVwoApproved(data: VwoApprovalNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.approvedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*WO Approved* @${userName}`,
        `WO No: ${data.woNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `After TDS (${data.tdsPercentage || '0'}%): ₹${data.amountAfterTds || 'N/A'}`,
        `Party: ${data.sellerName || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send VWO approval notification: ${err}`);
    }
  }

  async notifyPoCreated(data: PoCreatedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.createdBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*New PO Raised*`,
        `PO No: ${data.poNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `Party: ${data.sellerName || 'N/A'}`,
        `Raised by: ${userName}`,
        `Kindly approve ASAP.`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send PO created notification: ${err}`);
    }
  }

  async notifyPoRejected(data: PoRejectedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.rejectedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*PO Rejected* @${userName}`,
        `PO No: ${data.poNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `Party: ${data.sellerName || 'N/A'}`,
        `Reason: ${data.remark || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send PO rejected notification: ${err}`);
    }
  }

  async notifyPoUpdated(data: PoUpdatedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.updatedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*PO Updated* @${userName}`,
        `PO No: ${data.poNumber}`,
        `Party: ${data.sellerName || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send PO updated notification: ${err}`);
    }
  }

  async notifyVwoCreated(data: VwoCreatedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.createdBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*New WO Raised*`,
        `WO No: ${data.woNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `Party: ${data.sellerName || 'N/A'}`,
        `Raised by: ${userName}`,
        `Kindly approve ASAP.`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send VWO created notification: ${err}`);
    }
  }

  async notifyVwoRejected(data: VwoRejectedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.rejectedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*WO Rejected* @${userName}`,
        `WO No: ${data.woNumber}`,
        `Amount: ₹${data.grandTotal}`,
        `Party: ${data.sellerName || 'N/A'}`,
        `Reason: ${data.remark || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send VWO rejected notification: ${err}`);
    }
  }

  async notifyVwoUpdated(data: VwoUpdatedNotificationData): Promise<void> {
    try {
      const [user] = await this.db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, data.updatedBy))
        .limit(1);

      const userName = user?.name ?? 'Unknown';
      const lines: string[] = [
        `*WO Updated* @${userName}`,
        `WO No: ${data.woNumber}`,
        `Party: ${data.sellerName || 'N/A'}`,
      ];

      const text = lines.join('\n');
      await this.sendToTargets(text, { type: 'group', group: GROUPS.PAYMENTS });
    } catch (err) {
      this.logger.warn(`Failed to send VWO updated notification: ${err}`);
    }
  }

  async notifyWoBasicDetailsCreated(data: WoBasicDetailsCreatedData): Promise<void> {
    await this.sendWoBasicDetailsMessage({
      data,
      header: `Congrats!! We got new  Work Order (PO) From ${data.organizationName || 'N/A'}.`,
      event: 'New Work Order (PO)',
      actorLabel: 'Created by',
    });
  }

  async notifyWoBasicDetailsUpdated(data: WoBasicDetailsUpdatedData): Promise<void> {
    await this.sendWoBasicDetailsMessage({
      data,
      header: `Work Order (PO) has been updated from ${data.organizationName || 'N/A'}.`,
      event: 'Work Order (PO) Updated',
      actorLabel: 'Updated by',
    });
  }

  async notifyWoBasicDetailsRevised(data: WoBasicDetailsRevisedData): Promise<void> {
    const extraLines = [
      `- Revision: ${data.revisionNumber}`,
      `- Notes: ${data.revisionNotes || 'N/A'}`,
    ];
    await this.sendWoBasicDetailsMessage({
      data,
      header: `Work Order (PO) has been revised (Rev ${data.revisionNumber}) from ${data.organizationName || 'N/A'}.`,
      event: 'Work Order (PO) Revised',
      extraLines,
      actorLabel: 'Revised by',
    });
  }

  private async sendWoBasicDetailsMessage(options: {
    data: WoBasicDetailsCreatedData;
    header: string;
    event: string;
    actorLabel: string;
    extraLines?: string[];
  }): Promise<void> {
    const { data, header, event, actorLabel, extraLines } = options;

    let detailsUrl: string | undefined;
    try {
      detailsUrl = await this.publicLink.buildUrl({
        type: 'wobd',
        id: data.woBasicDetailId,
        event,
      });
    } catch (linkError) {
      this.logger.warn(
        `Failed to build public WO basic details link for WO basic detail ${data.woBasicDetailId}: ${linkError instanceof Error ? linkError.message : String(linkError)}`,
      );
    }

    const formattedValue =
      data.woValuePreGst != null && data.woValuePreGst !== ''
        ? `₹${Number(data.woValuePreGst).toLocaleString('en-IN')}`
        : 'N/A';

    const lines: string[] = [
      header,
      `- Project Name: ${data.projectName || 'N/A'}`,
      `- Project Code: ${data.projectCode || 'N/A'}`,
      `- Value (preGST): ${formattedValue}`,
    ];
    if (data.actorName) {
      lines.push(`- ${actorLabel}: ${data.actorName}`);
    }
    if (data.teamMemberName) {
      lines.push(`- TE Name: ${data.teamMemberName}`);
    }
    if (extraLines?.length) {
      lines.push(...extraLines);
    }
    if (detailsUrl) {
      lines.push(`View full details. ${detailsUrl}`);
    }

    const text = lines.join('\n');
    await this.sendToTargets(text, { type: 'group', group: GROUPS.WORKORDER });
  }
}
