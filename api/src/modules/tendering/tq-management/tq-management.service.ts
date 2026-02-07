import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, desc, isNotNull, sql, inArray, asc, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderQueries } from '@db/schemas/tendering/tender-queries.schema';
import { tenderQueryItems } from '@db/schemas/tendering';
import { teams } from '@db/schemas/master/teams.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

export interface TqManagementDashboardCounts {
    awaited: number;
    received: number;
    replied: number;
    qualified: number;
    disqualified: number;
    total: number;
}
export type TenderQueryStatus = 'TQ awaited' | 'TQ received' | 'TQ replied' | 'Disqualified, TQ missed' | 'Disqualified, No TQ received' | 'TQ replied, Qualified' | 'Qualified, No TQ received';
export type TqManagementFilters = {
    tqStatus?: TenderQueryStatus | TenderQueryStatus[];
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
    tqCount: number;
    bidSubmissionId: number | null;
}

@Injectable()
export class TqManagementService {
    private readonly logger = new Logger(TqManagementService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) { }

    /**
     * Build role-based filter conditions for tender queries
     */
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user && user.roleId) {
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Team Leader, Coordinator, Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

    /**
     * Get dashboard data by tab
     */
    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: 'awaited' | 'received' | 'replied' | 'qualified' | 'disqualified',
        filters?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        }
    ): Promise<PaginatedResult<TqManagementDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;
        const activeTab = tabKey ?? 'awaited';

        // Base conditions
        const conditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            eq(bidSubmissions.status, 'Bid Submitted'),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        conditions.push(...roleFilterConditions);

        // Latest TQ per tender (using subquery to get latest per tender)
        const latestTq = this.db.$with('latest_tq').as(
            this.db
                .select({
                    tenderId: tenderQueries.tenderId,
                    id: tenderQueries.id,
                    status: tenderQueries.status,
                    tqSubmissionDeadline: tenderQueries.tqSubmissionDeadline,
                    createdAt: tenderQueries.createdAt,
                })
                .from(tenderQueries)
                .where(
                    sql`${tenderQueries.id} = (
                        SELECT tq2.id
                        FROM ${tenderQueries} tq2
                        WHERE tq2.tender_id = ${tenderQueries.tenderId}
                        ORDER BY tq2.updated_at DESC, tq2.created_at DESC, tq2.id DESC
                        LIMIT 1
                    )`
                )
        );

        // Tab-specific conditions (simple & readable)
        if (activeTab === 'awaited') {
            conditions.push(
                or(
                    isNull(latestTq.id as any),
                    eq(latestTq.status, 'TQ awaited') as any
                ) as any
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'received') {
            conditions.push(eq(latestTq.status, 'TQ received') as any);
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'replied') {
            conditions.push(eq(latestTq.status, 'TQ replied') as any);
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'qualified') {
            conditions.push(
                inArray(latestTq.status, [
                    'Qualified, No TQ received',
                    'TQ replied, Qualified',
                ]) as any
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'disqualified') {
            conditions.push(
                inArray(latestTq.status, [
                    'Disqualified, No TQ received',
                    'Disqualified, TQ missed',
                ]) as any
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        // Search - search across all rendered columns
        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${bidSubmissions.submissionDatetime}::text ILIKE ${searchStr}`,
                sql`${latestTq.tqSubmissionDeadline}::text ILIKE ${searchStr}`,
                sql`${latestTq.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        // Sorting
        const sortOrder = filters?.sortOrder || 'desc';
        const sortFn = sortOrder === 'desc' ? desc : asc;

        let orderByClause: any = desc(bidSubmissions.submissionDatetime);

        switch (filters?.sortBy) {
            case 'tenderNo':
                orderByClause = sortFn(tenderInfos.tenderNo);
                break;
            case 'tenderName':
                orderByClause = sortFn(tenderInfos.tenderName);
                break;
            case 'teamMemberName':
                orderByClause = sortFn(users.name);
                break;
            case 'bidSubmissionDate':
                orderByClause = sortFn(bidSubmissions.submissionDatetime);
                break;
            case 'tqSubmissionDate':
                orderByClause = sortFn(latestTq.createdAt);
                break;
            case 'statusChangeDate':
                orderByClause = sortFn(tenderInfos.updatedAt);
                break;
        }

        // Count
        const [countResult] = await this.db
            .with(latestTq)
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(latestTq, eq(latestTq.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const tqCount = this.db.$with('tq_count').as(
            this.db
                .select({
                    tenderId: tenderQueries.tenderId,
                    count: sql<number>`count(*)::int`.as('count'),
                })
                .from(tenderQueries)
                .groupBy(tenderQueries.tenderId)
        );

        // Data
        const rows = await this.db
            .with(latestTq, tqCount)
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                itemName: items.name,
                statusName: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                bidSubmissionId: bidSubmissions.id,
                tqId: latestTq.id,
                tqStatus: latestTq.status,
                tqSubmissionDeadline: latestTq.tqSubmissionDeadline,
                tqCount: tqCount.count,
            })
            .from(tenderInfos)
            .leftJoin(latestTq, eq(latestTq.tenderId, tenderInfos.id))
            .leftJoin(tqCount, eq(tqCount.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .innerJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        // Final mapping (fixed: include required tqCount field)
        const result: TqManagementDashboardRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            itemName: row.itemName,
            statusName: row.statusName,
            bidSubmissionDate: row.bidSubmissionDate,
            tqId: row.tqId ?? null,
            tqStatus: (row.tqStatus ?? 'TQ awaited') as TenderQueryStatus,
            tqSubmissionDeadline: row.tqSubmissionDeadline ?? null,
            bidSubmissionId: row.bidSubmissionId,
            tqCount: row.tqCount ?? 0,
        }));


        return wrapPaginatedResponse(result, total, page, limit);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<TqManagementDashboardCounts> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            eq(bidSubmissions.status, 'Bid Submitted'),
            ...roleFilterConditions,
        ];

        // Get all tenders matching base conditions
        const allTenders = await this.db
            .select({
                tenderId: tenderInfos.id,
            })
            .from(tenderInfos)
            .leftJoin(
                bidSubmissions,
                and(
                    eq(bidSubmissions.tenderId, tenderInfos.id),
                    eq(bidSubmissions.status, 'Bid Submitted')
                )
            )
            .where(and(...baseConditions));

        const tenderIds = allTenders.map(t => t.tenderId);

        if (tenderIds.length === 0) {
            return {
                awaited: 0,
                received: 0,
                replied: 0,
                qualified: 0,
                disqualified: 0,
                total: 0,
            };
        }

        // Get all TQ records for these tenders, ordered by updatedAt DESC to prioritize recently updated TQs
        const allTqs = await this.db
            .select({
                tenderId: tenderQueries.tenderId,
                status: tenderQueries.status,
                createdAt: tenderQueries.createdAt,
                updatedAt: tenderQueries.updatedAt,
            })
            .from(tenderQueries)
            .where(inArray(tenderQueries.tenderId, tenderIds))
            .orderBy(desc(tenderQueries.updatedAt), desc(tenderQueries.createdAt));

        // Create a map of tenderId -> latest status (first occurrence is latest due to DESC order)
        const statusMap = new Map<number, TenderQueryStatus>();
        for (const tq of allTqs) {
            if (!statusMap.has(tq.tenderId)) {
                statusMap.set(tq.tenderId, tq.status as TenderQueryStatus);
            }
        }

        // Count by status
        let awaited = 0;
        let received = 0;
        let replied = 0;
        let qualified = 0;
        let disqualified = 0;

        for (const tenderId of tenderIds) {
            const status = statusMap.get(tenderId) || 'TQ awaited';
            if (status === 'TQ awaited') {
                awaited++;
            } else if (status === 'TQ received') {
                received++;
            } else if (status === 'TQ replied') {
                replied++;
            } else if (status === 'Qualified, No TQ received' || status === 'TQ replied, Qualified') {
                qualified++;
            } else if (status === 'Disqualified, No TQ received' || status === 'Disqualified, TQ missed') {
                disqualified++;
            }
        }

        return {
            awaited,
            received,
            replied,
            qualified,
            disqualified,
            total: awaited + received + replied + qualified + disqualified,
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

        // Send email notification
        await this.sendTqReceivedEmail(data.tenderId, result, data.receivedBy, data.tqItems);

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

        // Send email notification
        await this.sendTqRepliedEmail(tqRecord.tenderId, result[0], data.repliedBy);

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
                    status: 'Disqualified, TQ missed',
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

        // Send email notification
        await this.sendTqMissedEmail(tqRecord.tenderId, result[0], changedBy);

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
            const tqStatus = qualified ? 'Qualified, No TQ received' : 'Disqualified, No TQ received';
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
            // Update TQ record status based on qualification
            const tqStatus = qualified ? 'TQ replied, Qualified' : 'Disqualified, TQ missed';
            const updated = await tx
                .update(tenderQueries)
                .set({
                    status: tqStatus,
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

        // Send email notification only when qualified
        if (qualified) {
            await this.sendTqQualifiedEmail(tenderId, userId);
        }

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
     * Get accounts team ID
     */
    private async getAccountsTeamId(): Promise<number | null> {
        const [accountsTeam] = await this.db
            .select({ id: teams.id })
            .from(teams)
            .where(sql`LOWER(${teams.name}) LIKE '%account%'`)
            .limit(1);

        return accountsTeam?.id || null;
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
     * Send TQ received email
     */
    private async sendTqReceivedEmail(
        tenderId: number,
        tqRecord: { id: number; tqSubmissionDeadline: Date | null },
        receivedBy: number,
        tqItems: Array<{ tqTypeId: number; queryDescription: string }>
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get coordinator name
        const coordinatorEmails = await this.recipientResolver.getEmailsByRole('Coordinator', tender.team);
        let coordinatorName = 'Coordinator';
        if (coordinatorEmails.length > 0) {
            const [coordinatorUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, coordinatorEmails[0]))
                .limit(1);
            if (coordinatorUser?.name) {
                coordinatorName = coordinatorUser.name;
            }
        }

        // Get TQ types for display
        const tqTypeIds = tqItems.map(item => item.tqTypeId);
        const tqTypes = await this.db
            .select()
            .from(tenderQueryItems)
            .where(inArray(tenderQueryItems.tqTypeId, tqTypeIds))
            .limit(100); // Reasonable limit

        // Build TQ data array
        const tqData = tqItems.map(item => ({
            type: `TQ Type ${item.tqTypeId}`, // TODO: Get actual type name from master data
            desc: item.queryDescription,
        }));

        // Format due date
        const due = tqRecord.tqSubmissionDeadline ? new Date(tqRecord.tqSubmissionDeadline).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            te: teUser.name,
            tender_name: tender.tenderName,
            tender_no: tender.tenderNo,
            due,
            tqData,
            coordinator: coordinatorName,
        };

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
            { type: 'role', role: 'Team Leader', teamId: tender.team },
        ];

        await this.sendEmail(
            'tq.received',
            tenderId,
            receivedBy,
            `TQ Received - ${tender.tenderName}`,
            'tq-received',
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
                cc: ccRecipients,
            }
        );
    }

    /**
     * Send TQ replied email
     */
    private async sendTqRepliedEmail(
        tenderId: number,
        tqRecord: { repliedDatetime: Date | null },
        repliedBy: number
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

        // Format dates
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const tqSubmissionDate = tqRecord.repliedDatetime ? new Date(tqRecord.repliedDatetime).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Calculate time before deadline
        let timeBeforeDeadline = 'N/A';
        if (tender.dueDate && tqRecord.repliedDatetime) {
            const diffMs = new Date(tender.dueDate).getTime() - new Date(tqRecord.repliedDatetime).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            timeBeforeDeadline = `${diffHours} hours ${diffMinutes} minutes`;
        }

        const emailData = {
            tlName,
            tender_name: tender.tenderName,
            tender_no: tender.tenderNo,
            dueDate,
            tqSubmissionDate,
            timeBeforeDeadline,
            teName: teUser.name,
        };

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        await this.sendEmail(
            'tq.replied',
            tenderId,
            repliedBy,
            `TQ Replied - ${tender.tenderName}`,
            'tq-replied',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: ccRecipients,
            }
        );
    }

    /**
     * Send TQ qualified email
     */
    private async sendTqQualifiedEmail(
        tenderId: number,
        qualifiedBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        const teUser = await this.recipientResolver.getUserById(tender.teamMember);
        if (!teUser) return;

        // Get coordinator name
        const coordinatorEmails = await this.recipientResolver.getEmailsByRole('Coordinator', tender.team);
        let coordinatorName = 'Coordinator';
        if (coordinatorEmails.length > 0) {
            const [coordinatorUser] = await this.db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.email, coordinatorEmails[0]))
                .limit(1);
            if (coordinatorUser?.name) {
                coordinatorName = coordinatorUser.name;
            }
        }

        // Format due date
        const dueDate = tender.dueDate ? new Date(tender.dueDate).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            te: teUser.name,
            tender_name: tender.tenderName,
            tender_no: tender.tenderNo,
            dueDate,
            coordinator: coordinatorName,
        };

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
            { type: 'role', role: 'Team Leader', teamId: tender.team },
        ];

        await this.sendEmail(
            'tq.qualified',
            tenderId,
            qualifiedBy,
            `TQ Qualified - ${tender.tenderName}`,
            'tq-qualified',
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
                cc: ccRecipients,
            }
        );
    }

    /**
     * Send TQ missed email
     */
    private async sendTqMissedEmail(
        tenderId: number,
        tqRecord: { missedReason: string | null; preventionMeasures: string | null; tmsImprovements: string | null; tqSubmissionDeadline: Date | null },
        changedBy: number
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

        // Format TQ due date and time
        const tqDueDateTime = tqRecord.tqSubmissionDeadline ? new Date(tqRecord.tqSubmissionDeadline).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const emailData = {
            tl_name: tlName,
            tender_name: tender.tenderName,
            tender_no: tender.tenderNo,
            tq_due_date_time: tqDueDateTime,
            reason_missing: tqRecord.missedReason || 'Not specified',
            would_repeated: tqRecord.preventionMeasures || 'Not specified',
            tms_system: tqRecord.tmsImprovements || 'None',
            te_name: teUser.name,
        };

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Admin', teamId: tender.team },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        await this.sendEmail(
            'tq.missed',
            tenderId,
            changedBy,
            `TQ Missed - ${tender.tenderName}`,
            'tq-missed',
            emailData,
            {
                to: [{ type: 'user', userId: tender.teamMember }],
                cc: ccRecipients,
            }
        );
    }
}
