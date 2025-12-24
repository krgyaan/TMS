import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import type { PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';

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
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
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
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
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

        return {
            data: mappedRows,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    private bidSubmissionBaseWhere() {
        return and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        );
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

    async getDashboardCounts(): Promise<BidSubmissionDashboardCounts> {
        try {
            const baseWhere = this.bidSubmissionBaseWhere();

            // Pending count: tenders with approved costing but no bid submission
            const [{ count: pending }] = await this.bidSubmissionBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        eq(tenderCostingSheets.status, 'Approved'),
                        isNull(bidSubmissions.id)
                    )
                ) as any;

            // Submitted count: bid submissions with status 'Bid Submitted'
            const [{ count: submitted }] = await this.bidSubmissionBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(bidSubmissions.id),
                        eq(bidSubmissions.status, 'Bid Submitted')
                    )
                ) as any;

            // Missed count: bid submissions with status 'Tender Missed'
            const [{ count: missed }] = await this.bidSubmissionBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(bidSubmissions.id),
                        eq(bidSubmissions.status, 'Tender Missed')
                    )
                ) as any;

        return {
                pending: Number(pending || 0),
                submitted: Number(submitted || 0),
                missed: Number(missed || 0),
                total: Number(pending || 0) + Number(submitted || 0) + Number(missed || 0),
        };
        } catch (error) {
            console.error('Error in getDashboardCounts:', error);
            throw error;
        }
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

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
