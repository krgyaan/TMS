import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc, isNotNull, or, sql, asc, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderQueries } from '@db/schemas/tendering/tender-queries.schema';
import { tenderQueryItems } from '@db/schemas/tendering/';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

export type TqManagementFilters = {
    tqStatus?: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';
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
    tqStatus: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ';
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
        // Get all tenders that have TQ records OR submitted bids
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
                hasTq: tenderQueries.id,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            // LEFT JOIN bid submissions (may not exist for migration data)
            .leftJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            // LEFT JOIN tender queries to check if TQ exists
            .leftJoin(tenderQueries, eq(tenderQueries.tenderId, tenderInfos.id))
            .where(and(
                TenderInfosService.getActiveCondition(),
                TenderInfosService.getApprovedCondition(),
                TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                // Show if has TQ OR has submitted bid
                or(
                    isNotNull(tenderQueries.id),
                    isNotNull(bidSubmissions.id)
                )
            ));

        // Get unique tender IDs
        const uniqueTenderIds = [...new Set(rows.map(r => r.tenderId))];

        // For each tender, get latest TQ info and count
        const result: TqManagementDashboardRow[] = [];

        for (const tenderId of uniqueTenderIds) {
            // Get tender info (first matching row)
            const tenderRow = rows.find(r => r.tenderId === tenderId);
            if (!tenderRow) continue;

            // Get latest TQ record for this tender
            const latestTq = await this.db
                .select({
                    id: tenderQueries.id,
                    status: tenderQueries.status,
                    tqSubmissionDeadline: tenderQueries.tqSubmissionDeadline,
                })
                .from(tenderQueries)
                .where(eq(tenderQueries.tenderId, tenderId))
                .orderBy(desc(tenderQueries.createdAt))
                .limit(1);

            // Get count of TQ records
            const tqCountResult = await this.db
                .select({
                    count: sql<number>`count(*)::int`,
                })
                .from(tenderQueries)
                .where(eq(tenderQueries.tenderId, tenderId));

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

        // Filter by tqStatus if provided
        let filteredResult = result;
        if (filters?.tqStatus) {
            filteredResult = result.filter(row => row.tqStatus === filters.tqStatus);
        }

        // Apply sorting
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
            // Default sort: TQ received first, then by bid submission date (oldest first)
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

        // Apply pagination
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
        // Get all TQ records for this tender (ordered by latest first)
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
                'TQ received'
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
                'TQ replied'
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
                'TQ missed'
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
            // Create a TQ record with "No TQ" status
            const [tqRecord] = await tx
                .insert(tenderQueries)
                .values({
                    tenderId: tenderId,
                    status: 'No TQ',
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
                qualified ? 'Qualified, No TQ received' : 'Disqualified, No TQ received'
            );

            return tqRecord;
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

    /**
     * Get TQ Management Dashboard data - Updated implementation per requirements
     * Type logic based on tenderQueries.status field
     */
    async getTqData(
        type?: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<TqManagementDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Add type-specific filters
        if (type === 'TQ awaited') {
            baseConditions.push(
                eq(tenderQueries.status, 'Received')
            );
        } else if (type === 'TQ received') {
            baseConditions.push(
                eq(tenderQueries.status, 'Received')
            );
        } else if (type === 'TQ replied') {
            baseConditions.push(
                eq(tenderQueries.status, 'Replied')
            );
        } else if (type === 'TQ missed') {
            baseConditions.push(
                eq(tenderQueries.status, 'Missed')
            );
        } else if (type === 'No TQ') {
            baseConditions.push(
                eq(tenderQueries.status, 'No TQ, Qualified')
            );
        }

        const whereClause = and(...baseConditions);

        // Build orderBy clause
        let orderByClause: any = asc(bidSubmissions.submissionDatetime); // Default
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'bidSubmissionDate':
                    orderByClause = sortOrder(bidSubmissions.submissionDatetime);
                    break;
                case 'tqSubmissionDeadline':
                    orderByClause = sortOrder(tenderQueries.tqSubmissionDeadline);
                    break;
                default:
                    orderByClause = asc(bidSubmissions.submissionDatetime);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .innerJoin(tenderQueries, eq(tenderQueries.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data - get unique tender IDs first
        const tenderRows = await this.db
            .selectDistinct({
                tenderId: tenderInfos.id,
            })
            .from(tenderInfos)
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .innerJoin(tenderQueries, eq(tenderQueries.tenderId, tenderInfos.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset);

        const tenderIds = tenderRows.map((r) => r.tenderId);

        // Get full data for these tenders
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                tqStatus: tenderQueries.status,
                tqSubmissionDeadline: tenderQueries.tqSubmissionDeadline,
                tqId: tenderQueries.id,
            })
            .from(tenderInfos)
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .innerJoin(tenderQueries, eq(tenderQueries.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(
                and(
                    inArray(tenderInfos.id, tenderIds),
                    whereClause
                )
            )
            .orderBy(orderByClause);

        // Get TQ counts for each tender
        const tqCountsMap = new Map<number, number>();
        for (const tenderId of tenderIds) {
            const [countResult] = await this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(tenderQueries)
                .where(eq(tenderQueries.tenderId, tenderId));
            tqCountsMap.set(tenderId, Number(countResult?.count || 0));
        }

        // Group by tenderId and get latest TQ
        const tenderMap = new Map<number, TqManagementDashboardRow>();
        for (const row of rows) {
            const existing = tenderMap.get(row.tenderId);
            if (!existing || (row.tqId && existing.tqId && row.tqId > existing.tqId)) {
                tenderMap.set(row.tenderId, {
                    tenderId: row.tenderId,
                    tenderNo: row.tenderNo,
                    tenderName: `${row.tenderName} - ${row.tenderNo}`,
                    teamMemberName: row.teamMemberName,
                    itemName: row.itemName,
                    statusName: row.statusName,
                    bidSubmissionDate: row.bidSubmissionDate,
                    tqSubmissionDeadline: row.tqSubmissionDeadline,
                    tqStatus: (row.tqStatus as any) || 'TQ awaited',
                    tqId: row.tqId,
                    tqCount: tqCountsMap.get(row.tenderId) || 0,
                    bidSubmissionId: null,
                });
            }
        }

        const data = Array.from(tenderMap.values());

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
