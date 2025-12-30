import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, isNotNull, isNull, or, asc, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { getTabConfig, loadDashboardConfig } from '@/config/dashboard-config.loader';
import { buildTabConditions, getBaseDashboardConditions } from '@/modules/tendering/dashboards/dashboard-query-helper';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';

export type BidSubmissionDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    dueDate: Date | null;
    emdAmount: string | null;
    gstValues: number;
    finalCosting: string | null; // TL approved finalPrice
    bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
    bidSubmissionId: number | null;
    costingSheetId: number | null;
}

export type BidSubmissionFilters = {
    bidStatus?: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type BidSubmissionDashboardCounts = {
    pending: number;
    submitted: number;
    missed: number;
    total: number;
};

@Injectable()
export class BidSubmissionsService {
    private readonly logger = new Logger(BidSubmissionsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) { }

    /**
     * Get all tenders for bid submission dashboard
     * Shows:
     * 1. Tenders with approved costing (pending for bid submission)
     * 2. Tenders with existing bid submissions (regardless of costing status)
     */
    async findAll(filters?: BidSubmissionFilters): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build WHERE conditions
        const baseConditions = [
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 7), // Entry condition: Status 7
            or(
                eq(tenderCostingSheets.status, 'Approved'),
                isNotNull(bidSubmissions.id)
            )
        ];

        // Add bidStatus filter condition
        if (filters?.bidStatus) {
            if (filters.bidStatus === 'Submission Pending') {
                // Submission Pending: no bidSubmission record exists (isNull)
                baseConditions.push(isNull(bidSubmissions.id));
            } else {
                // Bid Submitted or Tender Missed: bidSubmission must exist and status must match
                baseConditions.push(
                    isNotNull(bidSubmissions.id),
                    eq(bidSubmissions.status, filters.bidStatus)
                );
            }
        }

        const whereClause = and(...baseConditions);

        // Build base query
        const baseQuery = this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                finalCosting: tenderCostingSheets.finalPrice,
                costingStatus: tenderCostingSheets.status,
                bidSubmissionId: bidSubmissions.id,
                bidSubmissionStatus: bidSubmissions.status,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(whereClause);

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Apply sorting
        let orderByClause;
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'gstValues':
                    orderByClause = sortOrder(tenderInfos.gstValues);
                    break;
                case 'finalCosting':
                    orderByClause = sortOrder(tenderCostingSheets.finalPrice);
                    break;
                case 'statusName':
                    orderByClause = sortOrder(statuses.name);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        } else {
            orderByClause = asc(tenderInfos.dueDate);
        }

        // Get paginated data
        const rows = await baseQuery
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        // Map rows
        const mappedRows = rows.map((row) => {
            let bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';

            if (!row.bidSubmissionId || !row.bidSubmissionStatus) {
                bidStatus = 'Submission Pending';
            } else {
                bidStatus = row.bidSubmissionStatus as 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            }

            return {
                tenderId: row.tenderId,
                tenderNo: row.tenderNo,
                tenderName: row.tenderName,
                teamMemberName: row.teamMemberName,
                itemName: row.itemName,
                statusName: row.statusName,
                dueDate: row.dueDate,
                emdAmount: row.emdAmount,
                gstValues: row.gstValues ? Number(row.gstValues) : 0,
                finalCosting: row.finalCosting,
                bidStatus: bidStatus,
                bidSubmissionId: row.bidSubmissionId,
                costingSheetId: row.costingSheetId,
            };
        });

        return wrapPaginatedResponse(mappedRows, total, page, limit);
    }

    private bidSubmissionBaseWhere() {
        return and(
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 7) // Entry condition: Status 7
        );
    }

    /**
     * Get dashboard data by tab - Refactored to use config
     */
    async getDashboardData(
        tabKey?: 'pending' | 'submitted' | 'disqualified' | 'tender-dnb',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'pending';
        const tabConfig = getTabConfig('bid-submission', activeTab);

        if (!tabConfig) {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Build base conditions
        const baseConditions = [
            ...getBaseDashboardConditions(['dnb', 'lost']),
            eq(tenderInfos.status, 7), // Entry condition
            or(
                eq(tenderCostingSheets.status, 'Approved'),
                isNotNull(bidSubmissions.id)
            )
        ];

        // Build tab-specific conditions
        const fieldMappings = {
            bidSubmissionId: bidSubmissions.id,
            bidStatus: bidSubmissions.status,
        };

        const conditions = buildTabConditions(
            'bid-submission',
            activeTab,
            baseConditions,
            fieldMappings
        );

        const whereClause = and(...conditions);

        // Build orderBy clause
        const sortBy = filters?.sortBy || tabConfig.sortBy;
        const sortOrder = filters?.sortOrder || tabConfig.sortOrder || 'asc';
        let orderByClause: any = asc(tenderInfos.dueDate);

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
                    orderByClause = sortFn(bidSubmissions.submissionDatetime);
                    break;
                case 'statusChangeDate':
                    orderByClause = sortFn(tenderInfos.updatedAt);
                    break;
                case 'gstValues':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'finalCosting':
                    orderByClause = sortFn(tenderCostingSheets.finalPrice);
                    break;
                case 'statusName':
                    orderByClause = sortFn(statuses.name);
                    break;
                default:
                    orderByClause = sortFn(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                finalCosting: tenderCostingSheets.finalPrice,
                costingStatus: tenderCostingSheets.status,
                bidSubmissionId: bidSubmissions.id,
                bidSubmissionStatus: bidSubmissions.status,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        // Map rows
        const mappedRows = rows.map((row) => {
            let bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            if (!row.bidSubmissionId || !row.bidSubmissionStatus) {
                bidStatus = 'Submission Pending';
            } else {
                bidStatus = row.bidSubmissionStatus as 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            }

            return {
                tenderId: row.tenderId,
                tenderNo: row.tenderNo,
                tenderName: row.tenderName,
                teamMemberName: row.teamMemberName,
                itemName: row.itemName,
                statusName: row.statusName,
                dueDate: row.dueDate,
                emdAmount: row.emdAmount,
                gstValues: row.gstValues ? Number(row.gstValues) : 0,
                finalCosting: row.finalCosting,
                bidStatus: bidStatus,
                bidSubmissionId: row.bidSubmissionId,
                costingSheetId: row.costingSheetId,
            };
        });

        return wrapPaginatedResponse(mappedRows, total, page, limit);
    }

    private bidSubmissionBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id));
    }

    async getDashboardCounts(): Promise<{ pending: number; submitted: number; disqualified: number; 'tender-dnb': number; total: number }> {
        try {
            const config = loadDashboardConfig();
            const dashboardConfig = config.dashboards['bid-submission'];

            const baseConditions = [
                ...getBaseDashboardConditions(['dnb', 'lost']),
                eq(tenderInfos.status, 7), // Entry condition
                or(
                    eq(tenderCostingSheets.status, 'Approved'),
                    isNotNull(bidSubmissions.id)
                )
            ];

            const fieldMappings = {
                bidSubmissionId: bidSubmissions.id,
                bidStatus: bidSubmissions.status,
            };

            const counts = await Promise.all([
                this.countTab('bid-submission', 'pending', baseConditions, fieldMappings),
                this.countTab('bid-submission', 'submitted', baseConditions, fieldMappings),
                this.countTab('bid-submission', 'disqualified', baseConditions, fieldMappings),
                this.countTab('bid-submission', 'tender-dnb', baseConditions, fieldMappings),
            ]);

            return {
                pending: counts[0],
                submitted: counts[1],
                disqualified: counts[2],
                'tender-dnb': counts[3],
                total: counts.reduce((sum, count) => sum + count, 0),
            };
        } catch (error) {
            this.logger.error('Error in getDashboardCounts:', error);
            return {
                pending: 0,
                submitted: 0,
                disqualified: 0,
                'tender-dnb': 0,
                total: 0,
            };
        }
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

        const [{ count }] = await this.bidSubmissionBaseQuery({
            count: sql<number>`count(distinct ${tenderInfos.id})`,
        })
            .where(whereClause) as any;

        return Number(count || 0);
    }

    async findById(id: number) {
        const result = await this.db
            .select()
            .from(bidSubmissions)
            .where(eq(bidSubmissions.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('Bid submission not found');
        }

        return result[0];
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db
            .select()
            .from(bidSubmissions)
            .where(eq(bidSubmissions.tenderId, tenderId))
            .limit(1);

        return result[0] || null;
    }

    async submitBid(data: {
        tenderId: number;
        submissionDatetime: Date;
        submittedDocs: string[];
        proofOfSubmission: string;
        finalPriceSs: string;
        finalBiddingPrice: string | null;
        submittedBy: number;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 17 (Bid Submitted) and track it
        const newStatus = 17; // Status ID for "Bid Submitted"

        // Check if bid submission already exists
        const existing = await this.findByTenderId(data.tenderId);

        const result = await this.db.transaction(async (tx) => {
            let bidSubmission;
            if (existing) {
                // Update existing
                const [updated] = await tx
                    .update(bidSubmissions)
                    .set({
                        status: 'Bid Submitted',
                        submissionDatetime: data.submissionDatetime,
                        finalBiddingPrice: data.finalBiddingPrice,
                        documents: {
                            submittedDocs: data.submittedDocs,
                            submissionProof: data.proofOfSubmission,
                            finalPriceSs: data.finalPriceSs,
                        },
                        submittedBy: data.submittedBy,
                        // Clear missed fields if any
                        reasonForMissing: null,
                        preventionMeasures: null,
                        tmsImprovements: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(bidSubmissions.id, existing.id))
                    .returning();

                bidSubmission = updated;
            } else {
                // Create new
                const [created] = await tx
                    .insert(bidSubmissions)
                    .values({
                        tenderId: data.tenderId,
                        status: 'Bid Submitted',
                        submissionDatetime: data.submissionDatetime,
                        finalBiddingPrice: data.finalBiddingPrice,
                        documents: {
                            submittedDocs: data.submittedDocs,
                            submissionProof: data.proofOfSubmission,
                            finalPriceSs: data.finalPriceSs,
                        },
                        submittedBy: data.submittedBy,
                    })
                    .returning();

                bidSubmission = created;
            }

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                data.submittedBy,
                prevStatus,
                'Bid submitted'
            );

            return bidSubmission;
        });

        // Send email notification
        await this.sendBidSubmittedEmail(data.tenderId, result, data.submittedBy);

        return result;
    }

    async markAsMissed(data: {
        tenderId: number;
        reasonForMissing: string;
        preventionMeasures: string;
        tmsImprovements: string;
        submittedBy: number;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 8 (Missed) and track it
        const newStatus = 8; // Status ID for "Missed"

        // Check if bid submission already exists
        const existing = await this.findByTenderId(data.tenderId);

        const result = await this.db.transaction(async (tx) => {
            let bidSubmission;
            if (existing) {
                // Update existing
                const [updated] = await tx
                    .update(bidSubmissions)
                    .set({
                        status: 'Tender Missed',
                        reasonForMissing: data.reasonForMissing,
                        preventionMeasures: data.preventionMeasures,
                        tmsImprovements: data.tmsImprovements,
                        submittedBy: data.submittedBy,
                        // Clear bid fields if any
                        submissionDatetime: null,
                        finalBiddingPrice: null,
                        documents: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(bidSubmissions.id, existing.id))
                    .returning();

                bidSubmission = updated;
            } else {
                // Create new
                const [created] = await tx
                    .insert(bidSubmissions)
                    .values({
                        tenderId: data.tenderId,
                        status: 'Tender Missed',
                        reasonForMissing: data.reasonForMissing,
                        preventionMeasures: data.preventionMeasures,
                        tmsImprovements: data.tmsImprovements,
                        submittedBy: data.submittedBy,
                    })
                    .returning();

                bidSubmission = created;
            }

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, data.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                data.tenderId,
                newStatus,
                data.submittedBy,
                prevStatus,
                'Tender missed'
            );

            return bidSubmission;
        });

        // Send email notification
        await this.sendBidMissedEmail(data.tenderId, result, data.submittedBy);

        return result;
    }

    async update(
        id: number,
        data: {
            submissionDatetime?: Date;
            submittedDocs?: string[];
            proofOfSubmission?: string;
            finalPriceSs?: string;
            finalBiddingPrice?: string | null;
            reasonForMissing?: string;
            preventionMeasures?: string;
            tmsImprovements?: string;
        }
    ) {
        const existing = await this.findById(id);

        // Build update object based on status
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (existing.status === 'Bid Submitted') {
            // Update bid-related fields
            if (data.submissionDatetime) updateData.submissionDatetime = data.submissionDatetime;
            if (data.finalBiddingPrice !== undefined) updateData.finalBiddingPrice = data.finalBiddingPrice;
            if (data.submittedDocs || data.proofOfSubmission || data.finalPriceSs) {
                updateData.documents = {
                    submittedDocs: data.submittedDocs || existing.documents?.submittedDocs || [],
                    submissionProof: data.proofOfSubmission || existing.documents?.submissionProof || null,
                    finalPriceSs: data.finalPriceSs || existing.documents?.finalPriceSs || null,
                };
            }
        } else if (existing.status === 'Tender Missed') {
            // Update missed-related fields
            if (data.reasonForMissing) updateData.reasonForMissing = data.reasonForMissing;
            if (data.preventionMeasures) updateData.preventionMeasures = data.preventionMeasures;
            if (data.tmsImprovements !== undefined) updateData.tmsImprovements = data.tmsImprovements;
        }

        const [result] = await this.db
            .update(bidSubmissions)
            .set(updateData)
            .where(eq(bidSubmissions.id, id))
            .returning();

        return result;
    }

    /**
     * Get Bid Submission Dashboard data - Updated implementation per requirements
     * Type logic based on bidSubmissions existence and status
     */
    async getBidSubmissionData(
        type?: 'pending' | 'submitted' | 'missed',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<BidSubmissionDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions - must have approved costing sheet
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            eq(tenderCostingSheets.status, 'Approved'),
        ];

        // Add type-specific filters
        if (type === 'pending') {
            baseConditions.push(
                or(
                    isNull(bidSubmissions.id),
                    eq(bidSubmissions.status, 'Submission Pending')
                )!
            );
        } else if (type === 'submitted') {
            baseConditions.push(eq(bidSubmissions.status, 'Bid Submitted'));
        } else if (type === 'missed') {
            baseConditions.push(eq(bidSubmissions.status, 'Tender Missed'));
        }

        const whereClause = and(...baseConditions);

        // Build orderBy clause
        let orderByClause: any = asc(tenderInfos.dueDate); // Default
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'dueDate':
                    orderByClause = sortOrder(tenderInfos.dueDate);
                    break;
                case 'finalCosting':
                    orderByClause = sortOrder(tenderCostingSheets.finalPrice);
                    break;
                default:
                    orderByClause = asc(tenderInfos.dueDate);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderCostingSheets, and(
                eq(tenderCostingSheets.tenderId, tenderInfos.id),
                eq(tenderCostingSheets.status, 'Approved')
            ))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                emdAmount: tenderInfos.emd,
                gstValues: tenderInfos.gstValues,
                costingSheetId: tenderCostingSheets.id,
                finalCosting: tenderCostingSheets.finalPrice,
                bidSubmissionId: bidSubmissions.id,
                bidSubmissionStatus: bidSubmissions.status,
            })
            .from(tenderInfos)
            .innerJoin(tenderCostingSheets, and(
                eq(tenderCostingSheets.tenderId, tenderInfos.id),
                eq(tenderCostingSheets.status, 'Approved')
            ))
            .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data: BidSubmissionDashboardRow[] = rows.map((row) => {
            let bidStatus: 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            if (!row.bidSubmissionId || !row.bidSubmissionStatus) {
                bidStatus = 'Submission Pending';
            } else {
                bidStatus = row.bidSubmissionStatus as 'Submission Pending' | 'Bid Submitted' | 'Tender Missed';
            }

            return {
                tenderId: row.tenderId,
                tenderNo: row.tenderNo,
                tenderName: `${row.tenderName} - ${row.tenderNo}`,
                teamMemberName: row.teamMemberName,
                itemName: row.itemName,
                statusName: row.statusName,
                dueDate: row.dueDate,
                emdAmount: row.emdAmount,
                gstValues: row.gstValues ? Number(row.gstValues) : 0,
                finalCosting: row.finalCosting,
                bidStatus,
                bidSubmissionId: row.bidSubmissionId,
                costingSheetId: row.costingSheetId,
            };
        });

        return wrapPaginatedResponse(data, total, page, limit);
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
     * Send bid submitted email
     */
    private async sendBidSubmittedEmail(
        tenderId: number,
        bidSubmission: { submissionDatetime: Date | null },
        submittedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

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

        // Get TE name
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || 'Tender Executive';

        // Format dates
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const bidSubmissionDate = bidSubmission.submissionDatetime ? new Date(bidSubmission.submissionDatetime).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Calculate time before deadline
        let timeBeforeDeadline = 'N/A';
        if (tender.dueDate && bidSubmission.submissionDatetime) {
            const diffMs = new Date(tender.dueDate).getTime() - new Date(bidSubmission.submissionDatetime).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            timeBeforeDeadline = `${diffHours} hours ${diffMinutes} minutes`;
        }

        const emailData = {
            tlName,
            tenderName: tender.tenderName,
            dueDate,
            bidSubmissionDate,
            timeBeforeDeadline,
            teName,
        };

        await this.sendEmail(
            'bid.submitted',
            tenderId,
            submittedBy,
            `Bid Submitted: ${tender.tenderNo}`,
            'bid-submitted',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
            }
        );
    }

    /**
     * Send bid missed email
     */
    private async sendBidMissedEmail(
        tenderId: number,
        bidSubmission: { reasonForMissing: string | null; preventionMeasures: string | null; tmsImprovements: string | null },
        submittedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

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

        // Get TE name
        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        const teName = teUser?.name || 'Tender Executive';

        // Format due date and time
        const dueDateTime = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            tl_name: tlName,
            tender_name: tender.tenderName,
            due_date_time: dueDateTime,
            reason: bidSubmission.reasonForMissing || 'Not specified',
            prevention: bidSubmission.preventionMeasures || 'Not specified',
            tms_improvements: bidSubmission.tmsImprovements || 'None',
            te_name: teName,
        };

        await this.sendEmail(
            'bid.missed',
            tenderId,
            submittedBy,
            `Bid Missed: ${tender.tenderNo}`,
            'bid-missed',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
            }
        );
    }
}
