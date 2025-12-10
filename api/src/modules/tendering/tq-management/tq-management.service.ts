import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc, isNotNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderQueries } from '@db/schemas/tendering/tender-queries.schema';
import { tenderQueryItems } from '@db/schemas/tendering/';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';

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
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async findAll(): Promise<TqManagementDashboardRow[]> {
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

        // Sort: TQ received first, then by bid submission date (oldest first)
        result.sort((a, b) => {
            // TQ received first
            const aHasTqReceived = a.tqStatus === 'TQ received';
            const bHasTqReceived = b.tqStatus === 'TQ received';
            if (aHasTqReceived && !bHasTqReceived) return -1;
            if (!aHasTqReceived && bHasTqReceived) return 1;

            // Then by bid submission date (oldest first)
            const aDate = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
            const bDate = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
            return aDate - bDate;
        });

        return result;
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
        // Create TQ record
        const [tqRecord] = await this.db
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
            await this.db.insert(tenderQueryItems).values(
                data.tqItems.map((item, index) => ({
                    tenderQueryId: tqRecord.id,
                    srNo: index + 1,
                    tqTypeId: item.tqTypeId,
                    queryDescription: item.queryDescription,
                }))
            );
        }

        return tqRecord;
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
        const [result] = await this.db
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

        return result;
    }

    async updateTqMissed(
        id: number,
        data: {
            missedReason: string;
            preventionMeasures: string;
            tmsImprovements: string;
        }
    ) {
        const [result] = await this.db
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

        return result;
    }

    async markAsNoTq(tenderId: number, userId: number) {
        // Create a TQ record with "No TQ" status
        const [result] = await this.db
            .insert(tenderQueries)
            .values({
                tenderId: tenderId,
                status: 'No TQ',
                receivedBy: userId,
                receivedAt: new Date(),
                tqSubmissionDeadline: null,
            })
            .returning();

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
