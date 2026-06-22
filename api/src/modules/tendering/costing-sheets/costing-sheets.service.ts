import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { and, eq, inArray, or, asc, desc, sql, isNull, isNotNull, notInArray, ne } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { tenderCostingDetails } from '@db/schemas/tendering/tender-costing-details.schema';
import { tenderStatusHistory } from '@db/schemas/tendering/tender-status-history.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { GoogleDriveService } from '@/modules/integrations/google/google-drive.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { bidSubmissions } from '@/db/schemas';

export type CostingSheetDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
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
    costingStatus: 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo';
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
    googleSheetUrl: string | null;
    costingSheetId: number | null;
}

export type CostingSheetFilters = {
    costingStatus?: 'pending' | 'submitted' | 'rejected';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

@Injectable()
export class CostingSheetsService {
    private readonly logger = new Logger(CostingSheetsService.name);
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly googleDriveService: GoogleDriveService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
    ) { }

    private determineCostingStatus(
        detailId: number | null,
        detailStatus: string | null
    ): 'Pending' | 'Created' | 'Submitted' | 'Approved' | 'Rejected/Redo' {
        if (!detailId) {
            return 'Pending';
        }
        if (!detailStatus) {
            return 'Created';
        }
        return detailStatus as 'Submitted' | 'Approved' | 'Rejected/Redo';
    }

    private buildDashboardConditions(user?: ValidatedUser, teamId?: number, tab?: string): any[] {
        const baseCondition = TenderInfosService.getActiveCondition();
        const baseConditions = [baseCondition, TenderInfosService.getApprovedCondition()];

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

        const conditions = [...baseConditions, ...roleFilterConditions];

        if (tab === 'pending') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['lost']));
            conditions.push(or(
                inArray(tenderCostingDetails.status, ['Pending', 'Rejected/Redo']),
                isNull(tenderCostingDetails.submittedFinalPrice)
            ) as any);
            conditions.push(or(ne(bidSubmissions.status, 'Tender Missed'), isNull(bidSubmissions)));
        } else if (tab === 'submitted') {
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb']));
            conditions.push(or(
                eq(tenderCostingDetails.status, 'Submitted'),
                isNotNull(tenderCostingDetails.submittedFinalPrice)
            ) as any);
            conditions.push(or(ne(bidSubmissions.status, 'Tender Missed'), isNull(bidSubmissions)));
        } else if (tab === 'tender-dnb') {
            conditions.push(eq(bidSubmissions.status, 'Tender Missed'));
        }

        return conditions;
    }

    async getDashboardData(
        tabKey?: 'pending' | 'submitted' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string },
        user?: ValidatedUser,
        teamId?: number
    ): Promise<PaginatedResult<CostingSheetDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';

        if (!['pending', 'submitted', 'tender-dnb'].includes(activeTab)) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        const conditions = this.buildDashboardConditions(user, teamId, activeTab);

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

        const whereClause = and(...conditions);

        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || 'desc';
        let orderByClause: any = desc(tenderInfos.dueDate);

        if (sortBy) {
            const sortFn = sortOrder === 'desc' ? desc : asc;
            switch (sortBy) {
                case 'tenderNo':
                    orderByClause = sortFn(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortFn(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortFn(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortFn(tenderInfos.dueDate);
                    break;
                case 'submissionDate':
                    orderByClause = sortFn(tenderCostingDetails.createdAt);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'gstValues':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'statusName':
                    orderByClause = sortFn(statuses.name);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                status: tenderInfos.status,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                costingDetailId: tenderCostingDetails.id,
                costingDetailStatus: tenderCostingDetails.status,
                submittedFinalPrice: tenderCostingDetails.submittedFinalPrice,
                submittedBudgetPrice: tenderCostingDetails.submittedBudgetPrice,
                googleSheetUrl: tenderCostingSheets.googleSheetUrl,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const data = rows.map((row) => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
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
            costingStatus: this.determineCostingStatus(row.costingDetailId, row.costingDetailStatus),
            submittedFinalPrice: row.submittedFinalPrice,
            submittedBudgetPrice: row.submittedBudgetPrice,
            googleSheetUrl: row.googleSheetUrl,
            costingSheetId: row.costingSheetId,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<{ pending: number; submitted: number; 'tender-dnb': number; total: number }> {
        const counts = await Promise.all([
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'pending')))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'submitted')))
                .then(([result]) => Number(result?.count || 0)),
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .leftJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
                .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
                .where(and(...this.buildDashboardConditions(user, teamId, 'tender-dnb')))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            pending: counts[0],
            submitted: counts[1],
            'tender-dnb': counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    async findByTenderId(tenderId: number) {
        const [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1);

        if (!sheet[0]) return null;

        const details = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.tenderCostingSheetId, sheet[0].id))
            .orderBy(asc(tenderCostingDetails.id));

        return {
            ...sheet[0],
            details,
        };
    }

    async findById(id: number) {
        const [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!sheet) throw new NotFoundException('Costing sheet not found');

        const details = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.tenderCostingSheetId, id))
            .orderBy(asc(tenderCostingDetails.id));

        return {
            ...sheet,
            details,
        };
    }

    private normalizeDetails(data: any): any[] {
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
            return data.details.map((d: any) => ({
                submittedFinalPrice: d.submittedFinalPrice,
                submittedReceiptPrice: d.submittedReceiptPrice,
                submittedBudgetPrice: d.submittedBudgetPrice,
                submittedGrossMargin: d.submittedGrossMargin,
                teRemarks: d.teRemarks,
            }));
        }
        // Backward compat: single-field format
        if (data.submittedFinalPrice) {
            return [{
                submittedFinalPrice: data.submittedFinalPrice,
                submittedReceiptPrice: data.submittedReceiptPrice,
                submittedBudgetPrice: data.submittedBudgetPrice,
                submittedGrossMargin: data.submittedGrossMargin,
                teRemarks: data.teRemarks,
            }];
        }
        return [];
    }

    async create(data: {
        tenderId: number;
        details?: Array<{
            submittedFinalPrice: string;
            submittedReceiptPrice: string;
            submittedBudgetPrice: string;
            submittedGrossMargin: string;
            teRemarks: string;
        }>;
        submittedFinalPrice?: string;
        submittedReceiptPrice?: string;
        submittedBudgetPrice?: string;
        submittedGrossMargin?: string;
        teRemarks?: string;
        submittedBy: number;
    }) {
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 6;
        const detailsInput = this.normalizeDetails(data);

        if (detailsInput.length === 0) {
            throw new BadRequestException('At least one costing detail is required');
        }

        // Ensure sheet exists
        let [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, data.tenderId))
            .limit(1);

        if (!sheet) {
            [sheet] = await this.db
                .insert(tenderCostingSheets)
                .values({ tenderId: data.tenderId })
                .returning();
        }

        const result = await this.db.transaction(async (tx) => {
            const created: any[] = [];
            for (const detail of detailsInput) {
                const [d] = await tx
                    .insert(tenderCostingDetails)
                    .values({
                        tenderCostingSheetId: sheet.id,
                        submittedFinalPrice: detail.submittedFinalPrice,
                        submittedReceiptPrice: detail.submittedReceiptPrice,
                        submittedBudgetPrice: detail.submittedBudgetPrice,
                        submittedGrossMargin: detail.submittedGrossMargin,
                        teRemarks: detail.teRemarks,
                        submittedBy: data.submittedBy,
                        status: 'Submitted',
                        submittedAt: new Date(),
                    })
                    .returning();
                created.push(d);
            }

            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                data.submittedBy,
                prevStatus,
                'Price bid ready',
                tx
            );

            return created;
        });

        await this.sendCostingSheetSubmittedEmail(data.tenderId, result[0], data.submittedBy);

        try {
            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: data.tenderId,
                stage: 'costing_sheet',
                userId: data.submittedBy,
                reason: 'Costing sheet submitted'
            });
        } catch (error) {
            this.logger.error(`Failed to stop timer: ${error}`);
        }

        return result;
    }

    async update(id: number, data: {
        details?: Array<{
            submittedFinalPrice?: string;
            submittedReceiptPrice?: string;
            submittedBudgetPrice?: string;
            submittedGrossMargin?: string;
            teRemarks?: string;
        }>;
        submittedFinalPrice?: string;
        submittedReceiptPrice?: string;
        submittedBudgetPrice?: string;
        submittedGrossMargin?: string;
        teRemarks?: string;
    }, changedBy: number) {
        const [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!sheet) throw new NotFoundException('Costing sheet not found');

        const currentTender = await this.tenderInfosService.findById(sheet.tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 6;
        const detailsInput = this.normalizeDetails(data);

        if (detailsInput.length === 0) {
            throw new BadRequestException('At least one costing detail is required');
        }

        const existingDetails = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.tenderCostingSheetId, id))
            .orderBy(asc(tenderCostingDetails.id));

        const [result] = await this.db.transaction(async (tx) => {
            const updated: any[] = [];

            for (let i = 0; i < detailsInput.length; i++) {
                const detailData = detailsInput[i];
                const updateFields: any = {
                    status: 'Submitted',
                    submittedAt: new Date(),
                    updatedAt: new Date(),
                };
                if (detailData.submittedFinalPrice !== undefined) updateFields.submittedFinalPrice = detailData.submittedFinalPrice;
                if (detailData.submittedReceiptPrice !== undefined) updateFields.submittedReceiptPrice = detailData.submittedReceiptPrice;
                if (detailData.submittedBudgetPrice !== undefined) updateFields.submittedBudgetPrice = detailData.submittedBudgetPrice;
                if (detailData.submittedGrossMargin !== undefined) updateFields.submittedGrossMargin = detailData.submittedGrossMargin;
                if (detailData.teRemarks !== undefined) updateFields.teRemarks = detailData.teRemarks;

                if (i < existingDetails.length) {
                    // Update existing detail
                    const [d] = await tx
                        .update(tenderCostingDetails)
                        .set(updateFields)
                        .where(eq(tenderCostingDetails.id, existingDetails[i].id))
                        .returning();
                    updated.push(d);
                } else {
                    // Insert new detail
                    const [d] = await tx
                        .insert(tenderCostingDetails)
                        .values({
                            tenderCostingSheetId: id,
                            ...updateFields,
                            submittedBy: changedBy,
                        })
                        .returning();
                    updated.push(d);
                }
            }

            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, sheet.tenderId));

            await this.tenderStatusHistoryService.trackStatusChange(
                sheet.tenderId,
                newStatus,
                changedBy,
                prevStatus,
                'Price bid ready',
                tx
            );

            return updated;
        });

        await this.sendCostingSheetSubmittedEmail(sheet.tenderId, result[0], changedBy);

        try {
            await this.timersService.stopTimer({
                entityType: 'TENDER',
                entityId: sheet.tenderId,
                stage: 'costing_sheet',
                userId: changedBy,
                reason: 'Costing sheet resubmitted'
            });
        } catch (error) {
            this.logger.error(`Failed to stop timer: ${error}`);
        }

        return result;
    }

    async addDetail(sheetId: number, data: {
        submittedFinalPrice: string;
        submittedReceiptPrice: string;
        submittedBudgetPrice: string;
        submittedGrossMargin: string;
        teRemarks: string;
    }, submittedBy: number) {
        const [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.id, sheetId))
            .limit(1);

        if (!sheet) throw new NotFoundException('Costing sheet not found');

        const [detail] = await this.db
            .insert(tenderCostingDetails)
            .values({
                tenderCostingSheetId: sheetId,
                submittedFinalPrice: data.submittedFinalPrice,
                submittedReceiptPrice: data.submittedReceiptPrice,
                submittedBudgetPrice: data.submittedBudgetPrice,
                submittedGrossMargin: data.submittedGrossMargin,
                teRemarks: data.teRemarks,
                submittedBy,
                status: 'Submitted',
                submittedAt: new Date(),
            })
            .returning();

        return detail;
    }

    async removeDetail(detailId: number) {
        const [detail] = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.id, detailId))
            .limit(1);

        if (!detail) throw new NotFoundException('Costing detail not found');
        if (detail.status !== 'Pending' && detail.status !== 'Rejected/Redo') {
            throw new BadRequestException('Can only remove pending or rejected details');
        }

        await this.db
            .delete(tenderCostingDetails)
            .where(eq(tenderCostingDetails.id, detailId));

        return { success: true };
    }

    async getCombinedPricing(tenderId: number): Promise<{
        totalFinalPrice: string | null;
        totalReceiptPrice: string | null;
        totalBudgetPrice: string | null;
        detailsCount: number;
        approvedCount: number;
    }> {
        const sheet = await this.db
            .select({ id: tenderCostingSheets.id })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1);

        if (!sheet[0]) {
            return { totalFinalPrice: null, totalReceiptPrice: null, totalBudgetPrice: null, detailsCount: 0, approvedCount: 0 };
        }

        const result = await this.db
            .select({
                totalFinalPrice: sql<string>`SUM(${tenderCostingDetails.finalPrice})`,
                totalReceiptPrice: sql<string>`SUM(${tenderCostingDetails.receiptPrice})`,
                totalBudgetPrice: sql<string>`SUM(${tenderCostingDetails.budgetPrice})`,
                detailsCount: sql<number>`count(*)`,
                approvedCount: sql<number>`COUNT(*) FILTER (WHERE ${tenderCostingDetails.status} = 'Approved')`,
            })
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.tenderCostingSheetId, sheet[0].id));

        return {
            totalFinalPrice: result[0]?.totalFinalPrice ?? null,
            totalReceiptPrice: result[0]?.totalReceiptPrice ?? null,
            totalBudgetPrice: result[0]?.totalBudgetPrice ?? null,
            detailsCount: Number(result[0]?.detailsCount ?? 0),
            approvedCount: Number(result[0]?.approvedCount ?? 0),
        };
    }

    async checkDriveScopes(userId: number) {
        return this.googleDriveService.checkUserHasDriveScopes(userId);
    }

    async createGoogleSheet(tenderId: number, userId: number): Promise<{
        success: boolean;
        sheetUrl?: string;
        sheetId?: string;
        message?: string;
        isDuplicate?: boolean;
        existingSheetUrl?: string;
        suggestedName?: string;
    }> {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) throw new NotFoundException(`Tender with ID ${tenderId} not found`);

        const teamId = tender.team;
        const sheetName = tender.tenderName;

        const teamConfig = this.googleDriveService.getTeamConfig(teamId);
        if (!teamConfig) throw new BadRequestException(`Team ${teamId} is not configured for Google Drive integration`);
        if (!teamConfig.folderId) throw new BadRequestException(`Google Drive folder not configured for team "${teamConfig.teamName}"`);

        const existingSheet = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1)
            .then(r => r[0] || null);

        if (existingSheet?.googleSheetUrl) {
            return {
                success: false,
                message: 'Costing sheet already exists for this tender',
                sheetUrl: existingSheet.googleSheetUrl,
                sheetId: existingSheet.googleSheetId || undefined,
            };
        }

        let duplicateCheck;
        try {
            duplicateCheck = await this.googleDriveService.checkDuplicateInFolder(userId, teamId, sheetName);
        } catch (error) {
            this.logger.error(`Error checking for duplicate sheet: ${error instanceof Error ? error.message : String(error)}`);
            throw new BadRequestException(`Failed to check for duplicate sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        if (duplicateCheck.isDuplicate) {
            return {
                success: false,
                isDuplicate: true,
                message: `A costing sheet with name "${sheetName}" already exists.`,
                existingSheetUrl: duplicateCheck.existingSheetUrl,
                suggestedName: duplicateCheck.suggestedName,
            };
        }

        let sheetResult;
        try {
            sheetResult = await this.googleDriveService.createSheet(userId, teamId, sheetName);
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
            throw new BadRequestException(`Failed to create Google Sheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        const now = new Date();
        if (existingSheet) {
            await this.db
                .update(tenderCostingSheets)
                .set({
                    googleSheetId: sheetResult.sheetId,
                    googleSheetUrl: sheetResult.sheetUrl,
                    sheetTitle: sheetResult.sheetTitle,
                    driveFolderId: sheetResult.folderId,
                    sheetCreatedBy: userId.toString(),
                    sheetCreatedAt: now,
                    updatedAt: now,
                })
                .where(eq(tenderCostingSheets.id, existingSheet.id));
        } else {
            await this.db.insert(tenderCostingSheets).values({
                tenderId,
                googleSheetId: sheetResult.sheetId,
                googleSheetUrl: sheetResult.sheetUrl,
                sheetTitle: sheetResult.sheetTitle,
                driveFolderId: sheetResult.folderId,
                sheetCreatedBy: userId.toString(),
                sheetCreatedAt: now,
            });
        }

        return { success: true, sheetUrl: sheetResult.sheetUrl, sheetId: sheetResult.sheetId };
    }

    async createGoogleSheetWithName(tenderId: number, userId: number, customName: string): Promise<{
        success: boolean;
        sheetUrl?: string;
        sheetId?: string;
        message?: string;
    }> {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) throw new NotFoundException(`Tender with ID ${tenderId} not found`);

        const teamId = tender.team;
        const teamConfig = this.googleDriveService.getTeamConfig(teamId);
        if (!teamConfig || !teamConfig.folderId) throw new BadRequestException(`Google Drive not configured for this team`);

        const existingSheet = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1)
            .then(r => r[0] || null);

        if (existingSheet?.googleSheetUrl) {
            return { success: false, message: 'Costing sheet already exists for this tender', sheetUrl: existingSheet.googleSheetUrl };
        }

        const sheetResult = await this.googleDriveService.createSheet(userId, teamId, customName);
        const now = new Date();

        if (existingSheet) {
            await this.db
                .update(tenderCostingSheets)
                .set({
                    googleSheetId: sheetResult.sheetId,
                    googleSheetUrl: sheetResult.sheetUrl,
                    sheetTitle: sheetResult.sheetTitle,
                    driveFolderId: sheetResult.folderId,
                    sheetCreatedBy: userId.toString(),
                    sheetCreatedAt: now,
                    updatedAt: now,
                })
                .where(eq(tenderCostingSheets.id, existingSheet.id));
        } else {
            await this.db.insert(tenderCostingSheets).values({
                tenderId,
                googleSheetId: sheetResult.sheetId,
                googleSheetUrl: sheetResult.sheetUrl,
                sheetTitle: sheetResult.sheetTitle,
                driveFolderId: sheetResult.folderId,
                sheetCreatedBy: userId.toString(),
                sheetCreatedAt: now,
            });
        }

        return { success: true, sheetUrl: sheetResult.sheetUrl, sheetId: sheetResult.sheetId };
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

    private async sendCostingSheetSubmittedEmail(
        tenderId: number,
        costingDetail: { googleSheetUrl?: string | null; submittedFinalPrice: string | null; submittedReceiptPrice: string | null; submittedBudgetPrice: string | null; submittedGrossMargin: string | null; teRemarks: string | null },
        submittedBy: number
    ) {
        // Get sheet URL if available
        const sheet = await this.db
            .select({ googleSheetUrl: tenderCostingSheets.googleSheetUrl })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1)
            .then(r => r[0] || null);

        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

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

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || 'Tender Executive';

        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not specified';
        const dueTime = tender.dueDate ? new Date(tender.dueDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not specified';

        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            tlName,
            tender_name: tender.tenderName,
            costingSheetLink: sheet?.googleSheetUrl || '#',
            tenderValue: formatCurrency(tender.gstValues),
            finalPrice: formatCurrency(costingDetail.submittedFinalPrice),
            receipt: formatCurrency(costingDetail.submittedReceiptPrice),
            budget: formatCurrency(costingDetail.submittedBudgetPrice),
            grossMargin: costingDetail.submittedGrossMargin ? `${costingDetail.submittedGrossMargin}%` : '0%',
            remarks: costingDetail.teRemarks || 'None',
            dueDate, dueTime, teName,
        };

        await this.sendEmail('costing-sheet.submitted', tenderId, 13,
            `Costing Sheet submitted - ${tender.tenderName}`,
            'costing-sheet-submitted', emailData,
            {
                to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
                // cc: [{ type: 'role', role: 'Admin', teamId: tender.team }],
            }
        );
    }
}
