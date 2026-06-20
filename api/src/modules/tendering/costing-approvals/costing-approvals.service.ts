import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, inArray, asc, desc, sql, isNull, notInArray, isNotNull, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { tenderCostingDetails } from '@db/schemas/tendering/tender-costing-details.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { users } from '@/db/schemas/auth/users.schema';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { bidSubmissions } from '@/db/schemas';

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    status: number;
    statusName: string | null;
    latestStatus: number | null;
    latestStatusName: string | null;
    statusRemark: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Submitted' | 'Approved' | 'Rejected/Redo';
    googleSheetUrl: string | null;
    costingSheetId: number | null;
    costingDetailId: number | null;
}

export type CostingApprovalFilters = {
    costingStatus?: 'Submitted' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type CostingApprovalDashboardCounts = {
    pending: number;
    approved: number;
    'tender-dnb': number;
    total: number;
};

@Injectable()
export class CostingApprovalsService {
    private readonly logger = new Logger(CostingApprovalsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
    ) { }

    private costingApprovalBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .innerJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember));
    }

    private getOrderBy(filters?: CostingApprovalFilters) {
        const sortOrder = filters?.sortOrder === 'desc' ? desc : asc;
        switch (filters?.sortBy) {
            case 'tenderNo': return sortOrder(tenderInfos.tenderNo);
            case 'tenderName': return sortOrder(tenderInfos.tenderName);
            case 'teamMemberName': return sortOrder(users.name);
            case 'dueDate': return sortOrder(tenderInfos.dueDate);
            case 'gstValues': return sortOrder(tenderInfos.gstValues);
            case 'statusName': return sortOrder(statuses.name);
            case 'costingStatus': return sortOrder(tenderCostingDetails.status);
            default: return desc(tenderInfos.dueDate);
        }
    }

    private buildDashboardConditions(user?: ValidatedUser, teamId?: number, activeTab?: string): any[] {
        const conditions: any[] = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(tenderCostingDetails.submittedFinalPrice),
        ];

        const roleFilterConditions: any[] = [];
        if (user && user.roleId) {
            if (user.dataScope === 'all') {
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.canSwitchTeams && teamId !== undefined && teamId !== null) {
                roleFilterConditions.push(eq(tenderInfos.team, teamId));
            } else if (user.dataScope === 'team') {
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`);
                }
            } else {
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`);
                }
            }
        } else {
            roleFilterConditions.push(sql`1 = 0`);
        }
        conditions.push(...roleFilterConditions);

        if (activeTab === 'pending') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['lost']));
            conditions.push(eq(tenderCostingDetails.status, 'Submitted'));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === 'approved') {
            conditions.push(eq(tenderCostingDetails.status, 'Approved'));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === 'tender-dnb') {
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        return conditions;
    }

    async getDashboardData(
        tab?: 'pending' | 'approved' | 'tender-dnb',
        filters?: CostingApprovalFilters,
        user?: ValidatedUser,
        teamId?: number
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tab || 'pending';
        if (!['pending', 'approved', 'tender-dnb'].includes(activeTab)) {
            throw new BadRequestException(`Invalid Tab: ${activeTab}`);
        }

        const conditions: any[] = this.buildDashboardConditions(user, teamId, activeTab);

        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${tenderInfos.dueDate}::text ILIKE ${searchStr} OR
                    ${users.name} ILIKE ${searchStr} OR
                    ${statuses.name} ILIKE ${searchStr}
                )`
            );
        }

        if (activeTab === 'pending') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['lost']));
            conditions.push(eq(tenderCostingDetails.status, 'Submitted'));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === 'approved') {
            conditions.push(eq(tenderCostingDetails.status, 'Approved'));
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === 'tender-dnb') {
            conditions.push(eq(bidSubmissions.status, "Tender Missed"));
        }

        const whereClause = and(...conditions);
        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || 'desc';
        const orderByClause = this.getOrderBy({ sortBy, sortOrder } as CostingApprovalFilters);

        const [{ count }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(whereClause) as any;

        const rows = await this.costingApprovalBaseQuery({
            tenderId: tenderInfos.id,
            tenderNo: tenderInfos.tenderNo,
            tenderName: tenderInfos.tenderName,
            teamMember: tenderInfos.teamMember,
            status: tenderInfos.status,
            teamMemberName: users.name,
            itemName: items.name,
            statusName: statuses.name,
            dueDate: tenderInfos.dueDate,
            emdAmount: tenderInfos.emd,
            gstValues: tenderInfos.gstValues,
            costingSheetId: tenderCostingSheets.id,
            costingDetailId: tenderCostingDetails.id,
            costingDetailStatus: tenderCostingDetails.status,
            googleSheetUrl: tenderCostingSheets.googleSheetUrl,
        })
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset) as any;

        const data = rows.map((row: any) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMember: row.teamMember,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            status: row.status,
            statusName: row.statusName,
            latestStatus: null,
            latestStatusName: null,
            statusRemark: null,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: row.costingDetailStatus,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
            costingDetailId: row.costingDetailId,
        }));

        return wrapPaginatedResponse(data, Number(count), page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<CostingApprovalDashboardCounts> {
        const counts = await Promise.all([
            this.costingApprovalBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(and(...this.buildDashboardConditions(user, teamId, 'pending')))
                .then(([result]: any) => Number(result?.count || 0)),
            this.costingApprovalBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(and(...this.buildDashboardConditions(user, teamId, 'approved')))
                .then(([result]: any) => Number(result?.count || 0)),
            this.costingApprovalBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(and(...this.buildDashboardConditions(user, teamId, 'tender-dnb')))
                .then(([result]: any) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            approved: counts[1],
            'tender-dnb': counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    async findById(id: number, userTeam: number) {
        // Accepts sheet ID, returns merged sheet + first detail data (backward compat)
        const result = await this.db
            .select({
                sheet: tenderCostingSheets,
                detail: tenderCostingDetails,
                tenderTeam: tenderInfos.team,
            })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(eq(tenderCostingSheets.id, id))
            .orderBy(asc(tenderCostingDetails.id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Costing sheet not found');
        }

        const { sheet, detail } = result[0];

        return {
            ...sheet,
            ...(detail ? {
                status: detail.status,
                submittedFinalPrice: detail.submittedFinalPrice,
                submittedReceiptPrice: detail.submittedReceiptPrice,
                submittedBudgetPrice: detail.submittedBudgetPrice,
                submittedGrossMargin: detail.submittedGrossMargin,
                teRemarks: detail.teRemarks,
                submittedBy: detail.submittedBy,
                submittedAt: detail.submittedAt,
                finalPrice: detail.finalPrice,
                receiptPrice: detail.receiptPrice,
                budgetPrice: detail.budgetPrice,
                grossMargin: detail.grossMargin,
                tlRemarks: detail.tlRemarks,
                rejectionReason: detail.rejectionReason,
                approvedBy: detail.approvedBy,
                approvedAt: detail.approvedAt,
            } : {}),
        };
    }

    async approve(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            finalPrice: string;
            receiptPrice: string;
            budgetPrice: string;
            grossMargin: string;
            oemVendorIds: number[];
            tlRemarks: string;
        }
    ) {
        // Accepts sheet ID, approves the first detail
        const result = await this.db
            .select({
                sheet: tenderCostingSheets,
                detail: tenderCostingDetails,
                tenderTeam: tenderInfos.team,
                tenderId: tenderInfos.id,
            })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(eq(tenderCostingSheets.id, id))
            .orderBy(asc(tenderCostingDetails.id))
            .limit(1);

        if (!result[0] || !result[0].detail) {
            throw new NotFoundException('Costing sheet or detail not found');
        }

        const { sheet, detail, tenderId } = result[0];
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 7;

        // Update sheet-level oemVendorIds + approve the detail
        const updatedDetail = await this.db.transaction(async (tx) => {
            await tx
                .update(tenderCostingSheets)
                .set({ oemVendorIds: data.oemVendorIds, updatedAt: new Date() })
                .where(eq(tenderCostingSheets.id, id));

            const [updated] = await tx
                .update(tenderCostingDetails)
                .set({
                    status: 'Approved',
                    finalPrice: data.finalPrice,
                    receiptPrice: data.receiptPrice,
                    budgetPrice: data.budgetPrice,
                    grossMargin: data.grossMargin,
                    tlRemarks: data.tlRemarks,
                    approvedBy: userId,
                    approvedAt: new Date(),
                    rejectionReason: null,
                    updatedAt: new Date(),
                })
                .where(eq(tenderCostingDetails.id, detail.id))
                .returning();

            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId, newStatus, userId, prevStatus, 'Price bid approved'
            );

            return updated;
        });

        await this.sendCostingSheetApprovedEmail(tenderId, updatedDetail, userId);

        try {
            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: tenderId,
                stage: 'costing_sheet_approval',
                userId,
                reason: 'Costing approved'
            });
        } catch (error) {
            this.logger.error(`Failed to stop timer: ${error}`);
        }

        return updatedDetail;
    }

    async reject(
        id: number,
        userTeam: number,
        userId: number,
        rejectionReason: string
    ) {
        const result = await this.db
            .select({
                sheet: tenderCostingSheets,
                detail: tenderCostingDetails,
                tenderId: tenderInfos.id,
            })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(eq(tenderCostingSheets.id, id))
            .orderBy(asc(tenderCostingDetails.id))
            .limit(1);

        if (!result[0] || !result[0].detail) {
            throw new NotFoundException('Costing sheet or detail not found');
        }

        const { detail, tenderId } = result[0];

        const [updated] = await this.db
            .update(tenderCostingDetails)
            .set({
                status: 'Rejected/Redo',
                rejectionReason,
                finalPrice: null,
                receiptPrice: null,
                budgetPrice: null,
                grossMargin: null,
                tlRemarks: null,
                approvedBy: null,
                approvedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(tenderCostingDetails.id, detail.id))
            .returning();

        await this.sendCostingSheetRejectedEmail(tenderId, updated, userId);
        return updated;
    }

    async updateApproved(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            finalPrice?: string;
            receiptPrice?: string;
            budgetPrice?: string;
            grossMargin?: string;
            oemVendorIds?: number[];
            tlRemarks?: string;
        }
    ) {
        const result = await this.db
            .select({
                sheet: tenderCostingSheets,
                detail: tenderCostingDetails,
            })
            .from(tenderCostingSheets)
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(eq(tenderCostingSheets.id, id))
            .orderBy(asc(tenderCostingDetails.id))
            .limit(1);

        if (!result[0] || !result[0].detail) {
            throw new NotFoundException('Costing sheet or detail not found');
        }

        const { detail } = result[0];
        if (detail.status !== 'Approved') {
            throw new ForbiddenException('Can only edit already approved costing sheets');
        }

        const updateData: any = {
            approvedBy: userId,
            approvedAt: new Date(),
            updatedAt: new Date(),
        };
        if (data.finalPrice !== undefined) updateData.finalPrice = data.finalPrice;
        if (data.receiptPrice !== undefined) updateData.receiptPrice = data.receiptPrice;
        if (data.budgetPrice !== undefined) updateData.budgetPrice = data.budgetPrice;
        if (data.grossMargin !== undefined) updateData.grossMargin = data.grossMargin;
        if (data.tlRemarks !== undefined) updateData.tlRemarks = data.tlRemarks;

        if (data.oemVendorIds !== undefined) {
            await this.db
                .update(tenderCostingSheets)
                .set({ oemVendorIds: data.oemVendorIds, updatedAt: new Date() })
                .where(eq(tenderCostingSheets.id, id));
        }

        const [updated] = await this.db
            .update(tenderCostingDetails)
            .set(updateData)
            .where(eq(tenderCostingDetails.id, detail.id))
            .returning();

        return updated;
    }

    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId, eventType, fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject, template, data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async sendCostingSheetApprovedEmail(
        tenderId: number,
        costingDetail: { googleSheetUrl?: string | null; finalPrice: string | null; tlRemarks: string | null },
        approvedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) tlName = tlUser.name;
        }

        const sheet = await this.db
            .select({ googleSheetUrl: tenderCostingSheets.googleSheetUrl })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1)
            .then(r => r[0] || null);

        const dueDateTime = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : 'Not specified';

        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            te_name: teUser.name,
            tender_name: tender.tenderName,
            costing_sheet_link: sheet?.googleSheetUrl || '#',
            tender_value: formatCurrency(tender.gstValues),
            approved_final_price: formatCurrency(costingDetail.finalPrice),
            remarks: costingDetail.tlRemarks || 'None',
            due_date_time: dueDateTime,
            tl_name: tlName,
        };

        await this.sendEmail('costing-sheet.approved', tenderId, approvedBy,
            `Costing approved - ${tender.tenderName}`, 'costing-sheet-approved', emailData,
            { to: [{ type: 'user', userId: tender.teamMember }], cc: [{ type: 'role', role: 'Admin', teamId: tender.team }] }
        );
    }

    private async sendCostingSheetRejectedEmail(
        tenderId: number,
        costingDetail: { googleSheetUrl?: string | null; rejectionReason: string | null },
        rejectedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) tlName = tlUser.name;
        }

        const sheet = await this.db
            .select({ googleSheetUrl: tenderCostingSheets.googleSheetUrl })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1)
            .then(r => r[0] || null);

        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified';
        const dueTime = tender.dueDate ? new Date(tender.dueDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not specified';

        const emailData = {
            teName: teUser.name,
            tenderName: tender.tenderName,
            costingSheetLink: sheet?.googleSheetUrl || '#',
            dueDate, dueTime, tlName,
        };

        await this.sendEmail('costing-sheet.rejected', tenderId, rejectedBy,
            `Costing Rejected/Redo costing - ${tender.tenderName}`, 'costing-sheet-rejected', emailData,
            { to: [{ type: 'user', userId: tender.teamMember }], cc: [{ type: 'role', role: 'Admin', teamId: tender.team }] }
        );
    }
}
