import { Inject, Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, inArray, asc, desc, sql, isNull, ne, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
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
import { AppLogger } from '@/logger/app-logger.service';
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
    status: number;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    submittedFinalPrice: string | null;
    submittedBudgetPrice: string | null;
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
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly timersService: TimersService,
    ) {
        this.logger = this.appLogger.withContext(CostingApprovalsService.name);
    }

    private costingApprovalBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .innerJoin(tenderInformation, eq(tenderInfos.id, tenderInformation.tenderId))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
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
            case 'costingStatus': return sortOrder(sql`(
                SELECT CASE
                    WHEN EXISTS(SELECT 1 FROM ${tenderCostingDetails}
                                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                                AND ${tenderCostingDetails.status} = 'Submitted') THEN 1
                    WHEN EXISTS(SELECT 1 FROM ${tenderCostingDetails}
                                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                                AND ${tenderCostingDetails.status} = 'Rejected/Redo') THEN 2
                    ELSE 3
                END
            )`);
            default: return desc(tenderInfos.dueDate);
        }
    }

    private buildDashboardConditions(user?: ValidatedUser, teamId?: number, activeTab?: string): any[] {
        const conditions: any[] = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            sql`EXISTS (SELECT 1 FROM ${tenderCostingDetails}
                        WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                        AND ${tenderCostingDetails.submittedFinalPrice} IS NOT NULL)`,
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
            conditions.push(sql`EXISTS (SELECT 1 FROM ${tenderCostingDetails}
                                       WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                                       AND ${tenderCostingDetails.status} = 'Submitted')`);
            conditions.push(or(ne(bidSubmissions.status, "Tender Missed"), isNull(bidSubmissions.status)));
        } else if (activeTab === 'approved') {
            conditions.push(sql`NOT EXISTS (SELECT 1 FROM ${tenderCostingDetails}
                                           WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                                           AND ${tenderCostingDetails.status} != 'Approved')`);
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
            statusName: statuses.name,
            dueDate: tenderInfos.dueDate,
            emdAmount: tenderInfos.emd,
            gstValues: tenderInfos.gstValues,
            submittedFinalPrice: sql<string | null>`(
                SELECT COALESCE(SUM(CAST(${tenderCostingDetails.submittedFinalPrice} AS NUMERIC)), '0')::text
                FROM ${tenderCostingDetails}
                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
            )`,
            submittedBudgetPrice: sql<string | null>`(
                SELECT COALESCE(SUM(CAST(${tenderCostingDetails.submittedBudgetPrice} AS NUMERIC)), '0')::text
                FROM ${tenderCostingDetails}
                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
            )`,
            costingSheetId: tenderCostingSheets.id,
            costingDetailId: sql<number | null>`(
                SELECT MIN(${tenderCostingDetails.id})
                FROM ${tenderCostingDetails}
                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
            )`,
            costingDetailStatus: sql<string | null>`(
                SELECT ${tenderCostingDetails.status}
                FROM ${tenderCostingDetails}
                WHERE ${tenderCostingDetails.tenderCostingSheetId} = ${tenderCostingSheets.id}
                ORDER BY CASE ${tenderCostingDetails.status}
                    WHEN 'Submitted' THEN 1
                    WHEN 'Rejected/Redo' THEN 2
                    WHEN 'Approved' THEN 3
                    ELSE 4
                END
                LIMIT 1
            )`,
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
            status: row.status,
            statusName: row.statusName,
            dueDate: row.dueDate,
            emdAmount: row.emdAmount,
            gstValues: row.gstValues ? Number(row.gstValues) : 0,
            submittedFinalPrice: row.submittedFinalPrice,
            submittedBudgetPrice: row.submittedBudgetPrice,
            costingStatus: row.costingDetailStatus || 'Submitted',
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
        const [sheet] = await this.db
            .select()
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!sheet) {
            throw new NotFoundException('Costing sheet not found');
        }

        const details = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(eq(tenderCostingDetails.tenderCostingSheetId, id))
            .orderBy(asc(tenderCostingDetails.id));

        return {
            ...sheet,
            details: details || [],
        };
    }

    async approve(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            detailId?: number;
            finalPrice: string;
            receiptPrice: string;
            budgetPrice: string;
            grossMargin: string;
            oemVendorIds: number[];
            tlRemarks: string;
        }
    ) {
        const [sheet] = await this.db
            .select({ tenderId: tenderInfos.id, team: tenderInfos.team })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!sheet) {
            throw new NotFoundException('Costing sheet not found');
        }

        const { tenderId } = sheet;
        const detailId = data.detailId;

        if (detailId) {
            const [detail] = await this.db
                .select()
                .from(tenderCostingDetails)
                .where(and(
                    eq(tenderCostingDetails.id, detailId),
                    eq(tenderCostingDetails.tenderCostingSheetId, id),
                ))
                .limit(1);

            if (!detail) {
                throw new NotFoundException('Costing detail not found');
            }

            if (detail.status !== 'Submitted') {
                throw new BadRequestException('Only submitted details can be approved');
            }

            const [updated] = await this.db
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
                .where(eq(tenderCostingDetails.id, detailId))
                .returning();

            await this.db
                .update(tenderCostingSheets)
                .set({ oemVendorIds: data.oemVendorIds, updatedAt: new Date() })
                .where(eq(tenderCostingSheets.id, id));

            return updated;
        }

        const allSubmitted = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(and(
                eq(tenderCostingDetails.tenderCostingSheetId, id),
                eq(tenderCostingDetails.status, 'Submitted'),
            ));

        if (allSubmitted.length === 0) {
            throw new NotFoundException('No submitted details found to approve');
        }

        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 7;

        const updatedDetails = await this.db.transaction(async (tx) => {
            await tx
                .update(tenderCostingSheets)
                .set({ oemVendorIds: data.oemVendorIds, updatedAt: new Date() })
                .where(eq(tenderCostingSheets.id, id));

            const updated = await tx
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
                .where(and(
                    eq(tenderCostingDetails.tenderCostingSheetId, id),
                    eq(tenderCostingDetails.status, 'Submitted'),
                ))
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

        if (updatedDetails.length > 0) {
            await this.sendCostingSheetApprovedEmail(tenderId, updatedDetails, userId);
        }

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

        return updatedDetails;
    }

    async reject(
        id: number,
        userTeam: number,
        userId: number,
        rejectionReason: string,
        detailId?: number,
    ) {
        if (detailId) {
            const [detail] = await this.db
                .select()
                .from(tenderCostingDetails)
                .where(and(
                    eq(tenderCostingDetails.id, detailId),
                    eq(tenderCostingDetails.tenderCostingSheetId, id),
                ))
                .limit(1);

            if (!detail) {
                throw new NotFoundException('Costing detail not found');
            }

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
                .where(eq(tenderCostingDetails.id, detailId))
                .returning();

            return updated;
        }

        const allSubmitted = await this.db
            .select({ id: tenderCostingDetails.id, tenderId: tenderInfos.id })
            .from(tenderCostingDetails)
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.id, tenderCostingDetails.tenderCostingSheetId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .where(and(
                eq(tenderCostingDetails.tenderCostingSheetId, id),
                eq(tenderCostingDetails.status, 'Submitted'),
            ));

        if (allSubmitted.length === 0) {
            throw new NotFoundException('No submitted details found to reject');
        }

        const tenderId = allSubmitted[0].tenderId;

        const updated = await this.db
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
            .where(and(
                eq(tenderCostingDetails.tenderCostingSheetId, id),
                eq(tenderCostingDetails.status, 'Submitted'),
            ))
            .returning();

        await this.sendCostingSheetRejectedEmail(tenderId, updated, userId);
        return updated;
    }

    async updateApproved(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            detailId: number;
            finalPrice?: string;
            receiptPrice?: string;
            budgetPrice?: string;
            grossMargin?: string;
            tlRemarks?: string;
        }
    ) {
        const [detail] = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(and(
                eq(tenderCostingDetails.id, data.detailId),
                eq(tenderCostingDetails.tenderCostingSheetId, id),
            ))
            .limit(1);

        if (!detail) {
            throw new NotFoundException('Costing detail not found');
        }

        if (detail.status !== 'Approved') {
            throw new ForbiddenException('Can only edit already approved costing details');
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

        const [updated] = await this.db
            .update(tenderCostingDetails)
            .set(updateData)
            .where(eq(tenderCostingDetails.id, data.detailId))
            .returning();

        return updated;
    }

    async approveAll(
        id: number,
        userTeam: number,
        userId: number,
        data: {
            approvals: {
                detailId: number;
                finalPrice: string;
                receiptPrice: string;
                budgetPrice: string;
                grossMargin: string;
                tlRemarks: string;
            }[];
            oemVendorIds: number[];
        }
    ) {
        const [sheet] = await this.db
            .select({ tenderId: tenderInfos.id })
            .from(tenderCostingSheets)
            .innerJoin(tenderInfos, eq(tenderInfos.id, tenderCostingSheets.tenderId))
            .where(eq(tenderCostingSheets.id, id))
            .limit(1);

        if (!sheet) {
            throw new NotFoundException('Costing sheet not found');
        }

        const { tenderId } = sheet;
        const detailIds = data.approvals.map(a => a.detailId);

        const existing = await this.db
            .select()
            .from(tenderCostingDetails)
            .where(and(
                eq(tenderCostingDetails.tenderCostingSheetId, id),
                inArray(tenderCostingDetails.id, detailIds),
                eq(tenderCostingDetails.status, 'Submitted'),
            ));

        if (existing.length === 0) {
            throw new NotFoundException('No submitted details found to approve');
        }

        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;
        const newStatus = 7;

        const updatedDetails = await this.db.transaction(async (tx) => {
            await tx
                .update(tenderCostingSheets)
                .set({ oemVendorIds: data.oemVendorIds, updatedAt: new Date() })
                .where(eq(tenderCostingSheets.id, id));

            const results: any[] = [];
            for (const approval of data.approvals) {
                const isSubmitted = existing.some(e => e.id === approval.detailId);
                if (!isSubmitted) continue;

                const [updated] = await tx
                    .update(tenderCostingDetails)
                    .set({
                        status: 'Approved',
                        finalPrice: approval.finalPrice,
                        receiptPrice: approval.receiptPrice,
                        budgetPrice: approval.budgetPrice,
                        grossMargin: approval.grossMargin,
                        tlRemarks: approval.tlRemarks,
                        approvedBy: userId,
                        approvedAt: new Date(),
                        rejectionReason: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(tenderCostingDetails.id, approval.detailId))
                    .returning();

                if (updated) results.push(updated[0]);
            }

            if (results.length > 0) {
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId, newStatus, userId, prevStatus, 'Price bid approved'
                );
            }

            return results;
        });

        if (updatedDetails.length > 0) {
            await this.sendCostingSheetApprovedEmail(tenderId, updatedDetails, userId);
        }

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

        return updatedDetails;
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
        approvedDetails: any[],
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

        const totals = approvedDetails.reduce((acc, d) => ({
            finalPrice: acc.finalPrice + Number(d.finalPrice || 0),
            receipt: acc.receipt + Number(d.receiptPrice || 0),
            budget: acc.budget + Number(d.budgetPrice || 0),
        }), { finalPrice: 0, receipt: 0, budget: 0 });

        const emailData = {
            te_name: teUser.name,
            tender_name: tender.tenderName,
            costing_sheet_link: sheet?.googleSheetUrl || '#',
            tender_value: formatCurrency(tender.gstValues),
            details: approvedDetails.map((d: any, i: number) => ({
                index: i + 1,
                approvedFinalPrice: formatCurrency(d.finalPrice),
                approvedReceipt: formatCurrency(d.receiptPrice),
                approvedBudget: formatCurrency(d.budgetPrice),
                approvedGrossMargin: d.grossMargin ? `${d.grossMargin}%` : '0%',
                tlRemarks: d.tlRemarks || '—',
            })),
            totalApprovedFinalPrice: formatCurrency(totals.finalPrice.toString()),
            totalApprovedReceipt: formatCurrency(totals.receipt.toString()),
            totalApprovedBudget: formatCurrency(totals.budget.toString()),
            due_date_time: dueDateTime,
            tl_name: tlName,
        };

        await this.sendEmail('costing-sheet.approved', tenderId, approvedBy,
            `Costing approved - ${tender.tenderName}`, 'costing-sheet-approved', emailData,
            { 
                to: [{ type: 'user', userId: tender.teamMember}], 
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }] 
            }
        );
    }

    private async sendCostingSheetRejectedEmail(
        tenderId: number,
        rejectedDetails: any[],
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
            details: rejectedDetails.map((d: any, i: number) => ({
                index: i + 1,
                rejectionReason: d.rejectionReason || '—',
            })),
            dueDate, dueTime, tlName,
        };

        await this.sendEmail('costing-sheet.rejected', tenderId, rejectedBy,
            `Costing Rejected/Redo costing - ${tender.tenderName}`, 'costing-sheet-rejected', emailData,
            { 
                to: [{ type: 'user', userId: tender.teamMember }], 
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }] 
            }
        );
    }
}
