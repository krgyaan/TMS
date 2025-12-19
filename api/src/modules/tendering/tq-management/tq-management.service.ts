import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc, isNotNull, isNull, or, sql, asc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderQueries } from '@db/schemas/tendering/tender-queries.schema';
import { tenderQueryItems } from '@db/schemas/tendering';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

export interface TqManagementDashboardCounts {
    awaited: number;
    received: number;
    replied: number;
    missed: number;
    noTq: number;
    qualified: number;
    total: number;
}
export type TenderQueryStatus = 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ Disqualified' | 'TQ Qualified' | 'No TQ, Qualified';
export type TqManagementFilters = {
    tqStatus?: TenderQueryStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type TqManagementDashboardRow = {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    itemName: string | null;
    statusName: string | null;
    bidSubmissionDate: Date | null;
    tqSubmissionDeadline: Date | null;
    tqStatus: TenderQueryStatus;
    tqId: number | null;
    tqCount: number; // Number of TQ records for this tender
    bidSubmissionId: number | null;
}

@Injectable()
export class TqManagementService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
    ) { }

    async findAll(filters?: TqManagementFilters): Promise<PaginatedResult<TqManagementDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const tenderIdsWithTq = await this.db
            .selectDistinct({
                tenderId: tenderQueries.tenderId,
            })
            .from(tenderQueries);

        const tenderIdsWithBid = await this.db
            .selectDistinct({
                tenderId: bidSubmissions.tenderId,
            })
            .from(bidSubmissions)
            .where(eq(bidSubmissions.status, 'Bid Submitted'));

        const allTenderIds = [...new Set([
            ...tenderIdsWithTq.map(r => r.tenderId),
            ...tenderIdsWithBid.map(r => r.tenderId),
        ])];


        if (allTenderIds.length === 0) {
            return {
                data: [],
                meta: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                },
            };
        }

        const validTenderIds = await this.db
            .select({
                tenderId: tenderInfos.id,
            })
            .from(tenderInfos)
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    inArray(tenderInfos.id, allTenderIds)
                )
            );

        const tenderIds = validTenderIds.map(r => r.tenderId);

        if (tenderIds.length === 0) {
            return {
                data: [],
                meta: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                },
            };
        }


        // First, let's check if the tender exists with basic conditions
        const tenderCheck = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                teamMember: tenderInfos.teamMember,
                status: tenderInfos.status,
                deleteStatus: tenderInfos.deleteStatus,
                tlStatus: tenderInfos.tlStatus,
            })
            .from(tenderInfos)
            .where(inArray(tenderInfos.id, tenderIds));

        const tenderCheckFiltered = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                teamMember: tenderInfos.teamMember,
                status: tenderInfos.status,
            })
            .from(tenderInfos)
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    inArray(tenderInfos.id, tenderIds)
                )
            );

        // Check if user and status exist for the tender
        if (tenderCheckFiltered.length > 0) {
            const tender = tenderCheckFiltered[0];
            if (tender.teamMember) {
                const userCheck = await this.db
                    .select({ id: users.id, name: users.name })
                    .from(users)
                    .where(eq(users.id, tender.teamMember))
                    .limit(1);
            }
            const statusCheck = await this.db
                .select({ id: statuses.id, name: statuses.name })
                .from(statuses)
                .where(eq(statuses.id, tender.status))
                .limit(1);
        }

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                bidSubmissionId: bidSubmissions.id,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    inArray(tenderInfos.id, tenderIds)
                )
            );
        const result: TqManagementDashboardRow[] = [];

        for (const tenderRow of rows) {
            const latestTq = await this.db
                .select({
                    id: tenderQueries.id,
                    status: tenderQueries.status,
                    tqSubmissionDeadline: tenderQueries.tqSubmissionDeadline,
                })
                .from(tenderQueries)
                .where(eq(tenderQueries.tenderId, tenderRow.tenderId))
                .orderBy(desc(tenderQueries.createdAt))
                .limit(1);

            const tqCountResult = await this.db
                .select({
                    count: sql<number>`count(*)::int`,
                })
                .from(tenderQueries)
                .where(eq(tenderQueries.tenderId, tenderRow.tenderId));

            const tqCount = tqCountResult[0]?.count || 0;

            result.push({
                tenderId: tenderRow.tenderId,
                tenderNo: tenderRow.tenderNo,
                tenderName: tenderRow.tenderName,
                teamMemberName: tenderRow.teamMemberName,
                itemName: tenderRow.itemName,
                statusName: tenderRow.statusName,
                bidSubmissionDate: tenderRow.bidSubmissionDate,
                tqSubmissionDeadline: latestTq[0]?.tqSubmissionDeadline || null,
                tqStatus: (latestTq[0]?.status as any) || 'TQ awaited',
                tqId: latestTq[0]?.id || null,
                tqCount: tqCount,
                bidSubmissionId: tenderRow.bidSubmissionId,
            });
        }

        let filteredResult = result;
        if (filters?.tqStatus) {
            filteredResult = result.filter(row => row.tqStatus === filters.tqStatus);
        }

        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
            filteredResult.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                switch (filters.sortBy) {
                    case 'tenderNo':
                        aVal = a.tenderNo;
                        bVal = b.tenderNo;
                        break;
                    case 'tenderName':
                        aVal = a.tenderName;
                        bVal = b.tenderName;
                        break;
                    case 'teamMemberName':
                        aVal = a.teamMemberName || '';
                        bVal = b.teamMemberName || '';
                        break;
                    case 'bidSubmissionDate':
                        aVal = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
                        bVal = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
                        break;
                    case 'tqSubmissionDeadline':
                        aVal = a.tqSubmissionDeadline ? new Date(a.tqSubmissionDeadline).getTime() : 0;
                        bVal = b.tqSubmissionDeadline ? new Date(b.tqSubmissionDeadline).getTime() : 0;
                        break;
                    case 'tqCount':
                        aVal = a.tqCount || 0;
                        bVal = b.tqCount || 0;
                        break;
                    case 'tqStatus':
                        aVal = a.tqStatus || '';
                        bVal = b.tqStatus || '';
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return -1 * sortOrder;
                if (aVal > bVal) return 1 * sortOrder;
                return 0;
            });
        } else {
            filteredResult.sort((a, b) => {
                const aHasTqReceived = a.tqStatus === 'TQ received';
                const bHasTqReceived = b.tqStatus === 'TQ received';
                if (aHasTqReceived && !bHasTqReceived) return -1;
                if (!aHasTqReceived && bHasTqReceived) return 1;

                const aDate = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
                const bDate = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
                return aDate - bDate;
            });
        }

        const totalFiltered = filteredResult.length;
        const paginatedData = filteredResult.slice(offset, offset + limit);

        return {
            data: paginatedData,
            meta: {
                total: totalFiltered,
                page,
                limit,
                totalPages: Math.ceil(totalFiltered / limit),
            },
        };
    }

    async findById(id: number) {
        const result = await this.db
            .select()
            .from(tenderQueries)
            .where(eq(tenderQueries.id, id))
            .limit(1);

        if (!result[0]) {
            throw new NotFoundException('TQ record not found');
        }

        return result[0];
    }

    async findByTenderId(tenderId: number) {
        const result = await this.db
            .select()
            .from(tenderQueries)
            .where(eq(tenderQueries.tenderId, tenderId))
            .orderBy(desc(tenderQueries.createdAt));

        return result;
    }

    async getTqItems(tqId: number) {
        return await this.db
            .select()
            .from(tenderQueryItems)
            .where(eq(tenderQueryItems.tenderQueryId, tqId))
            .orderBy(tenderQueryItems.srNo);
    }

    private tqManagementBaseWhere() {
        return and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
        );
    }

    private tqManagementBaseQuery(select: any): any {
        return this.db
            .select(select)
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            .leftJoin(tenderQueries, eq(tenderQueries.tenderId, tenderInfos.id));
    }

    async getDashboardCounts(): Promise<TqManagementDashboardCounts> {
        try {
            const baseWhere = this.tqManagementBaseWhere();

            const [{ count: awaited }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(bidSubmissions.id),
                        isNull(tenderQueries.id)
                    )
                ) as any;

            // TQ received: TQ records with status 'TQ received'
            const [{ count: received }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(tenderQueries.id),
                        eq(tenderQueries.status, 'TQ received')
                    )
                ) as any;

            // TQ replied: TQ records with status 'TQ replied'
            const [{ count: replied }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(tenderQueries.id),
                        eq(tenderQueries.status, 'TQ replied')
                    )
                ) as any;

            // TQ missed: TQ records with status 'TQ missed'
            const [{ count: missed }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(tenderQueries.id),
                        eq(tenderQueries.status, 'TQ missed')
                    )
                ) as any;

            // No TQ: TQ records with status 'No TQ, Qualified' or 'No TQ Disqualified'
            const [{ count: noTq }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(tenderQueries.id),
                        or(
                            eq(tenderQueries.status, 'No TQ, Qualified'),
                            eq(tenderQueries.status, 'No TQ Disqualified')
                        )
                    )
                ) as any;

            // TQ qualified: TQ records with status 'TQ Qualified'
            const [{ count: qualified }] = await this.tqManagementBaseQuery({
                count: sql<number>`count(distinct ${tenderInfos.id})`,
            })
                .where(
                    and(
                        baseWhere,
                        isNotNull(tenderQueries.id),
                        eq(tenderQueries.status, 'TQ Qualified')
                    )
                ) as any;


            return {
                awaited: Number(awaited || 0),
                received: Number(received || 0),
                replied: Number(replied || 0),
                missed: Number(missed || 0),
                noTq: Number(noTq || 0),
                qualified: Number(qualified || 0),
                total: Number(awaited || 0) + Number(received || 0) + Number(replied || 0) + Number(missed || 0) + Number(noTq || 0) + Number(qualified || 0),
            };
        } catch (error) {
            console.error('Error in getDashboardCounts:', error);
            throw error;
        }
    }

    async createTqReceived(data: {
        tenderId: number;
        tqSubmissionDeadline: Date;
        tqDocumentReceived: string | null;
        receivedBy: number;
        tqItems: Array<{
            tqTypeId: number;
            queryDescription: string;
        }>;
    }) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(data.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 19 (TQ Received) and track it
        const newStatus = 19; // Status ID for "TQ Received"

        const result = await this.db.transaction(async (tx) => {
            // Create TQ record
            const [tqRecord] = await tx
                .insert(tenderQueries)
                .values({
                    tenderId: data.tenderId,
                    tqSubmissionDeadline: data.tqSubmissionDeadline,
                    tqDocumentReceived: data.tqDocumentReceived,
                    receivedBy: data.receivedBy,
                    receivedAt: new Date(),
                    status: 'TQ received',
                })
                .returning();

            // Create TQ items
            if (data.tqItems && data.tqItems.length > 0) {
                await tx.insert(tenderQueryItems).values(
                    data.tqItems.map((item, index) => ({
                        tenderQueryId: tqRecord.id,
                        srNo: index + 1,
                        tqTypeId: item.tqTypeId,
                        queryDescription: item.queryDescription,
                    }))
                );
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
                data.receivedBy,
                prevStatus,
                'TQ received',
                tx
            );

            return tqRecord;
        });

        return result;
    }

    async updateTqReplied(
        id: number,
        data: {
            repliedDatetime: Date;
            repliedDocument: string | null;
            proofOfSubmission: string;
            repliedBy: number;
        }
    ) {
        // Get TQ record to find tenderId
        const tqRecord = await this.findById(id);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tqRecord.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 20 (TQ replied) and track it
        // Note: Status 40 (TQ replied, Qualified) would require additional qualification check
        const newStatus = 20; // Status ID for "TQ replied"

        const result = await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(tenderQueries)
                .set({
                    status: 'TQ replied',
                    repliedDatetime: data.repliedDatetime,
                    repliedDocument: data.repliedDocument,
                    proofOfSubmission: data.proofOfSubmission,
                    repliedBy: data.repliedBy,
                    repliedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(tenderQueries.id, id))
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tqRecord.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tqRecord.tenderId,
                newStatus,
                data.repliedBy,
                prevStatus,
                'TQ replied',
                tx
            );

            return updated;
        });

        return result[0];
    }

    async updateTqMissed(
        id: number,
        data: {
            missedReason: string;
            preventionMeasures: string;
            tmsImprovements: string;
        },
        changedBy: number
    ) {
        // Get TQ record to find tenderId
        const tqRecord = await this.findById(id);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tqRecord.tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status to 39 (Disqualified, TQ missed) and track it
        const newStatus = 39; // Status ID for "Disqualified, TQ missed"

        const result = await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(tenderQueries)
                .set({
                    status: 'TQ missed',
                    missedReason: data.missedReason,
                    preventionMeasures: data.preventionMeasures,
                    tmsImprovements: data.tmsImprovements,
                    updatedAt: new Date(),
                })
                .where(eq(tenderQueries.id, id))
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tqRecord.tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tqRecord.tenderId,
                newStatus,
                changedBy,
                prevStatus,
                'TQ missed',
                tx
            );

            return updated;
        });

        return result[0];
    }

    async markAsNoTq(tenderId: number, userId: number, qualified: boolean = true) {
        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status based on qualification
        // Status 37 (Qualified, No TQ received) or Status 38 (Disqualified, No TQ received)
        const newStatus = qualified ? 37 : 38;

        const result = await this.db.transaction(async (tx) => {
            // Create a TQ record with "No TQ" status based on qualification
            const tqStatus = qualified ? 'No TQ, Qualified' : 'No TQ Disqualified';
            const [tqRecord] = await tx
                .insert(tenderQueries)
                .values({
                    tenderId: tenderId,
                    status: tqStatus,
                    receivedBy: userId,
                    receivedAt: new Date(),
                    tqSubmissionDeadline: null,
                })
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId,
                newStatus,
                userId,
                prevStatus,
                qualified ? 'Qualified, No TQ received' : 'Disqualified, No TQ received',
                tx
            );

            return tqRecord;
        });

        return result;
    }

    async tqQualified(id: number, userId: number, qualified: boolean = true) {
        // Get TQ record to find tenderId
        const tqRecord = await this.findById(id);
        const tenderId = tqRecord.tenderId;

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        // AUTO STATUS CHANGE: Update tender status based on qualification
        // Status 40 (TQ replied, Qualified) or Status 39 (Disqualified, TQ missed)
        const newStatus = qualified ? 40 : 39;

        const result = await this.db.transaction(async (tx) => {
            // Update TQ record with "TQ Qualified" status
            const updated = await tx
                .update(tenderQueries)
                .set({
                    status: 'TQ Qualified',
                    updatedAt: new Date(),
                })
                .where(eq(tenderQueries.id, id))
                .returning();

            // Update tender status
            await tx
                .update(tenderInfos)
                .set({ status: newStatus, updatedAt: new Date() })
                .where(eq(tenderInfos.id, tenderId));

            // Track status change
            await this.tenderStatusHistoryService.trackStatusChange(
                tenderId,
                newStatus,
                userId,
                prevStatus,
                qualified ? 'TQ Qualified' : 'TQ Disqualified',
                tx
            );

            return updated[0];
        });

        return result;
    }

    async updateTqReceived(
        id: number,
        data: {
            tqSubmissionDeadline: Date;
            tqDocumentReceived: string | null;
            tqItems: Array<{
                tqTypeId: number;
                queryDescription: string;
            }>;
        }
    ) {
        // Update TQ record
        const [tqRecord] = await this.db
            .update(tenderQueries)
            .set({
                tqSubmissionDeadline: data.tqSubmissionDeadline,
                tqDocumentReceived: data.tqDocumentReceived,
                updatedAt: new Date(),
            })
            .where(eq(tenderQueries.id, id))
            .returning();

        // Delete existing TQ items
        await this.db
            .delete(tenderQueryItems)
            .where(eq(tenderQueryItems.tenderQueryId, id));

        // Create new TQ items
        if (data.tqItems && data.tqItems.length > 0) {
            await this.db.insert(tenderQueryItems).values(
                data.tqItems.map((item, index) => ({
                    tenderQueryId: id,
                    srNo: index + 1,
                    tqTypeId: item.tqTypeId,
                    queryDescription: item.queryDescription,
                }))
            );
        }

        return tqRecord;
    }
}
