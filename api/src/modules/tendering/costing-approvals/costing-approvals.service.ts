import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, inArray, asc, desc, sql, isNull, notInArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { users } from '@/db/schemas/auth/users.schema';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { getTabConfig, loadDashboardConfig } from '@/config/dashboard-config.loader';
import { buildTabConditions, getBaseDashboardConditions } from '@/modules/tendering/dashboards/dashboard-query-helper';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';

export type CostingApprovalDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMember: number | null;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    costingStatus: 'Submitted' | 'Approved' | 'Rejected/Redo';
    googleSheetUrl: string | null;
    costingSheetId: number | null;
}

export type CostingApprovalFilters = {
    costingStatus?: 'Submitted' | 'Approved' | 'Rejected/Redo';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type CostingApprovalDashboardCounts = {
    submitted: number;
    approved: number;
    rejected: number;
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
    ) { }

    private costingStatusWhere(status?: 'Submitted' | 'Approved' | 'Rejected/Redo') {
        if (status) {
            return eq(tenderCostingSheets.status, status);
        }

        return inArray(tenderCostingSheets.status, [
            'Submitted',
            'Approved',
            'Rejected/Redo',
        ]);
    }

    private costingApprovalBaseWhere() {
        return and(
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 6) // Entry condition: Status 6
        );
    }

    private costingApprovalBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .innerJoin(
                tenderInformation,
                eq(tenderInfos.id, tenderInformation.tenderId)
            )
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                tenderCostingSheets,
                eq(tenderCostingSheets.tenderId, tenderInfos.id)
            )
            .innerJoin(users, eq(users.id, tenderInfos.teamMember));
    }

    private getOrderBy(filters?: CostingApprovalFilters) {
        const sortOrder = filters?.sortOrder === 'desc' ? desc : asc;

        switch (filters?.sortBy) {
            case 'tenderNo':
                return sortOrder(tenderInfos.tenderNo);
            case 'tenderName':
                return sortOrder(tenderInfos.tenderName);
            case 'teamMemberName':
                return sortOrder(users.name);
            case 'dueDate':
                return sortOrder(tenderInfos.dueDate);
            case 'gstValues':
                return sortOrder(tenderInfos.gstValues);
            case 'statusName':
                return sortOrder(statuses.name);
            case 'costingStatus':
                return sortOrder(tenderCostingSheets.status);
            default:
                return asc(tenderInfos.dueDate);
        }
    }


    async findAllForApproval(
        userTeam: number,
        filters?: CostingApprovalFilters
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {

        const page = filters?.page ?? 1;
        const limit = filters?.limit ?? 50;
        const offset = (page - 1) * limit;

        const whereClause = and(
            this.costingApprovalBaseWhere(),
            this.costingStatusWhere(filters?.costingStatus),
        );
        const [{ count }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(whereClause) as any;
        const orderByClause = this.getOrderBy(filters);
        const rows = await this.costingApprovalBaseQuery({
            tenderId: tenderInfos.id,
            tenderNo: tenderInfos.tenderNo,
            tenderName: tenderInfos.tenderName,
            teamMember: tenderInfos.teamMember,
            teamMemberName: users.name,
            itemName: items.name,
            statusName: statuses.name,
            dueDate: tenderInfos.dueDate,
            emdAmount: tenderInfos.emd,
            gstValues: tenderInfos.gstValues,
            costingSheetId: tenderCostingSheets.id,
            costingStatus: tenderCostingSheets.status,
            googleSheetUrl: tenderCostingSheets.googleSheetUrl,
        })
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset) as any;

        return wrapPaginatedResponse(rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMember: row.teamMember,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: row.costingStatus,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        })), Number(count), page, limit);
    }

    /**
     * Get dashboard data by tab - Refactored to use config
     */
    async getDashboardData(
        userTeam: number,
        tabKey?: 'pending' | 'approved' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<CostingApprovalDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';
        const tabConfig = getTabConfig('costing-approval', activeTab);

        if (!tabConfig) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Build base conditions
        const baseConditions = [
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 6), // Entry condition
        ];

        // Build tab-specific conditions
        const fieldMappings = {
            costingApprovalStatus: tenderCostingSheets.status,
        };

        const conditions = buildTabConditions(
            'costing-approval',
            activeTab,
            baseConditions,
            fieldMappings
        );

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy || tabConfig.sortBy;
        const sortOrder = filters?.sortOrder || tabConfig.sortOrder || 'asc';
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
            teamMemberName: users.name,
            itemName: items.name,
            statusName: statuses.name,
            dueDate: tenderInfos.dueDate,
            emdAmount: tenderInfos.emd,
            gstValues: tenderInfos.gstValues,
            costingSheetId: tenderCostingSheets.id,
            costingStatus: tenderCostingSheets.status,
            googleSheetUrl: tenderCostingSheets.googleSheetUrl,
        })
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset) as any;

        const data = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMember: row.teamMember,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            costingStatus: row.costingStatus,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        }));

        return wrapPaginatedResponse(data, Number(count), page, limit);
    }

    async getDashboardCounts(): Promise<{ pending: number; approved: number; 'tender-dnb': number; total: number }> {
        const config = loadDashboardConfig();
        const dashboardConfig = config.dashboards['costing-approval'];

        const baseConditions = [
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 6), // Entry condition
        ];

        const fieldMappings = {
            costingApprovalStatus: tenderCostingSheets.status,
        };

        const counts = await Promise.all([
            this.countTab('costing-approval', 'pending', baseConditions, fieldMappings),
            this.countTab('costing-approval', 'approved', baseConditions, fieldMappings),
            this.countTab('costing-approval', 'tender-dnb', baseConditions, fieldMappings),
        ]);

        return {
            pending: counts[0],
            approved: counts[1],
            'tender-dnb': counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    /**
     * Helper method to count items for a specific tab
     */
    private async countTab(
        dashboardName: string,
        tabKey: string,
        baseConditions: any[],
        fieldMappings: Record<string, any>
    ): Promise<number> {
        const tabConfig = getTabConfig(dashboardName, tabKey);
        if (!tabConfig) {
            return 0;
        }

        const conditions = buildTabConditions(
            dashboardName,
            tabKey,
            baseConditions,
            fieldMappings
        );

        const whereClause = and(...conditions);

        const [{ count }] = await this.costingApprovalBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(whereClause) as any;

        return Number(count || 0);
    }

    async findById(id: number, userTeam: number) {
        // Join with tenderInfos to verify team access
        const result = await this.db
            .select({
                costingSheet: tenderCostingSheets,
                tenderTeam: tenderInfos.team,
            })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Costing sheet not found');
        }

        // Verify team access
        // if (result[0].tenderTeam !== userTeam) {
        //     throw new ForbiddenException('You can only access costing sheets in your team');
        // }

        return result[0].costingSheet;
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
        // Verify access
        const costingSheet = await this.findById(id, userTeam);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(costingSheet.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 7 (Price Bid Approved) and track it
        const newStatus = 7; // Status ID for "Price Bid Approved"

        const [result] = await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(tenderCostingSheets)
                .set({
                    status: 'Approved',
                    finalPrice: data.finalPrice,
                    receiptPrice: data.receiptPrice,
                    budgetPrice: data.budgetPrice,
                    grossMargin: data.grossMargin,
                    oemVendorIds: data.oemVendorIds,
                    tlRemarks: data.tlRemarks,
                    approvedBy: userId,
                    approvedAt: new Date(),
                    rejectionReason: null, // Clear rejection reason if any
                    updatedAt: new Date(),
                })
                .where(eq(tenderCostingSheets.id, id))
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, costingSheet.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                costingSheet.tenderId,
                newStatus,
                userId,
                prevStatus,
                'Price bid approved'
            );

            return updated;
        });

        // Send email notification
        await this.sendCostingSheetApprovedEmail(costingSheet.tenderId, result, userId);

        return result;
    }

    async reject(
        id: number,
        userTeam: number,
        userId: number,
        rejectionReason: string
    ) {
        // Verify access
        await this.findById(id, userTeam);

        const [result] = await this.db
            .update(tenderCostingSheets)
            .set({
                status: 'Rejected/Redo',
                rejectionReason: rejectionReason,
                // Clear approved fields
                finalPrice: null,
                receiptPrice: null,
                budgetPrice: null,
                grossMargin: null,
                oemVendorIds: null,
                tlRemarks: null,
                approvedBy: null,
                approvedAt: null,
                updatedAt: new Date(),
            })
            .where(eq(tenderCostingSheets.id, id))
            .returning();

        // Send email notification
        await this.sendCostingSheetRejectedEmail(result.tenderId, result, userId);

        return result;
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
        // Verify access and that it's already approved
        const existing = await this.findById(id, userTeam);

        if (existing.status !== 'Approved') {
            throw new ForbiddenException('Can only edit already approved costing sheets');
        }

        const updateData: any = {
            approvedBy: userId, // Update approver
            approvedAt: new Date(), // Update approval time
            updatedAt: new Date(),
        };

        if (data.finalPrice !== undefined) updateData.finalPrice = data.finalPrice;
        if (data.receiptPrice !== undefined) updateData.receiptPrice = data.receiptPrice;
        if (data.budgetPrice !== undefined) updateData.budgetPrice = data.budgetPrice;
        if (data.grossMargin !== undefined) updateData.grossMargin = data.grossMargin;
        if (data.oemVendorIds !== undefined) updateData.oemVendorIds = data.oemVendorIds;
        if (data.tlRemarks !== undefined) updateData.tlRemarks = data.tlRemarks;

        const [result] = await this.db
            .update(tenderCostingSheets)
            .set(updateData)
            .where(eq(tenderCostingSheets.id, id))
            .returning();

        return result;
    }

    /**
     * Helper method to send email notifications
     */
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
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send costing sheet approved email
     */
    private async sendCostingSheetApprovedEmail(
        tenderId: number,
        costingSheet: { googleSheetUrl: string | null; finalPrice: string | null; tlRemarks: string | null },
        approvedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        // Format due date and time
        const dueDateTime = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Format currency values
        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            te_name: teUser.name,
            tender_name: tender.tenderName,
            costing_sheet_link: costingSheet.googleSheetUrl || '#',
            tender_value: formatCurrency(tender.gstValues),
            approved_final_price: formatCurrency(costingSheet.finalPrice),
            remarks: costingSheet.tlRemarks || 'None',
            due_date_time: dueDateTime,
            tl_name: tlName,
        };

        await this.sendEmail(
            'costing-sheet.approved',
            tenderId,
            approvedBy,
            `Costing Sheet Approved: ${tender.tenderNo}`,
            'costing-sheet-approved',
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }],
            }
        );
    }

    /**
     * Send costing sheet rejected email
     */
    private async sendCostingSheetRejectedEmail(
        tenderId: number,
        costingSheet: { googleSheetUrl: string | null; rejectionReason: string | null },
        rejectedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get Team Leader name
        const teamLeaderEmails = await this.recipientResolver.getEmailsByRole('Team Leader', tender.team);
        let tlName = 'Team Leader';
        if (teamLeaderEmails.length > 0) {
            const [tlUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, teamLeaderEmails[0]))
                .limit(1);
            if (tlUser?.name) {
                tlName = tlUser.name;
            }
        }

        // Format due date and time
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) : 'Not specified';
        const dueTime = tender.dueDate ? new Date(tender.dueDate).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            teName: teUser.name,
            tenderName: tender.tenderName,
            costingSheetLink: costingSheet.googleSheetUrl || '#',
            dueDate,
            dueTime,
            tlName,
        };

        await this.sendEmail(
            'costing-sheet.rejected',
            tenderId,
            rejectedBy,
            `Costing Sheet Rejected: ${tender.tenderNo}`,
            'costing-sheet-rejected',
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
            }
        );
    }
}
