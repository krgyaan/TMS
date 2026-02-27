import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, eq, lte, asc, desc, sql, inArray, isNull, isNotNull, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { ScheduleRaDto, UploadRaResultDto } from '@/modules/tendering/reverse-auction/dto/reverse-auction.dto';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

export type RaDashboardFilters = {
    type?: RaDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
};

export type RaDashboardType = 'under-evaluation' | 'scheduled' | 'completed';

export type RaDashboardRow = {
    id: number | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamMemberName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    raStatus: string;
    raStartTime: Date | null;
    raEndTime: Date | null;
    technicallyQualified: string | null;
    result: string | null;
    hasRaEntry: boolean;
};

export type RaDashboardResponse = {
    data: RaDashboardRow[];
    counts: RaDashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

export type RaDashboardCounts = {
    underEvaluation: number;
    scheduled: number;
    completed: number;
    total: number;
};

const RA_STATUS = {
    UNDER_EVALUATION: 'Under Evaluation',
    RA_SCHEDULED: 'RA Scheduled',
    DISQUALIFIED: 'Disqualified',
    RA_STARTED: 'RA Started',
    RA_ENDED: 'RA Ended',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
} as const;

@Injectable()
export class ReverseAuctionService {
    private readonly logger = new Logger(ReverseAuctionService.name);

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
            if (user.roleId === 1 || user.roleId === 2 || user.roleId === 4) {
                // Super User or Admin or Coordinator: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.roleId === 3 || user.roleId === 6) {
                // Team Leader, Engineer: Filter by primary_team_id
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
     * Get RA Dashboard data with counts for all tabs - Direct queries without config
     */
    async getDashboardData(
        user?: ValidatedUser,
        teamId?: number,
        tabKey?: 'under-evaluation' | 'scheduled' | 'completed',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }
    ): Promise<RaDashboardResponse> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const activeTab = tabKey || 'under-evaluation';

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            eq(bidSubmissions.status, 'Bid Submitted'),
            inArray(tenderInformation.reverseAuctionApplicable, ['Yes', 'YES']),
        ];

        // Apply role-based filtering
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        const conditions = [...baseConditions, ...roleFilterConditions];

        // Tab-specific filtering based on raResult field (matching Laravel logic)
        if (activeTab === 'under-evaluation') {
            // Under-evaluation: No RA OR (RA exists but no result AND no schedule times)
            // Exclude records that have schedule times (they belong in scheduled tab)
            conditions.push(
                or(
                    isNull(reverseAuctions.id),
                    and(
                        isNull(reverseAuctions.raResult),
                        isNull(reverseAuctions.raStartTime),
                        isNull(reverseAuctions.raEndTime)
                    )!
                )!
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'scheduled') {
            // Scheduled: RA exists, result is null, and has start/end times
            conditions.push(
                isNotNull(reverseAuctions.id),
                isNull(reverseAuctions.raResult),
                or(
                    isNotNull(reverseAuctions.raStartTime),
                    isNotNull(reverseAuctions.raEndTime)
                )!
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else if (activeTab === 'completed') {
            // Laravel: RA exists AND result IS NOT NULL
            conditions.push(
                isNotNull(reverseAuctions.id),
                isNotNull(reverseAuctions.raResult)
            );
            conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
        } else {
            throw new BadRequestException(`Invalid tab: ${activeTab}`);
        }

        if (filters?.search) {
            const searchStr = `%${filters.search}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${bidSubmissions.submissionDatetime}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${items.name} ILIKE ${searchStr}`,
                sql`${reverseAuctions.status} ILIKE ${searchStr}`,
                sql`${reverseAuctions.raStartTime}::text ILIKE ${searchStr}`,
                sql`${reverseAuctions.raEndTime}::text ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        const sortBy = filters?.sortBy;
        const sortOrder = filters?.sortOrder || 'desc';
        let orderByClause: any = desc(bidSubmissions.submissionDatetime);

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
                case 'bidSubmissionDate':
                    orderByClause = sortFn(bidSubmissions.submissionDatetime);
                    break;
                case 'completionDate':
                    orderByClause = sortFn(reverseAuctions.raEndTime);
                    break;
                case 'tenderValue':
                    orderByClause = sortFn(tenderInfos.gstValues);
                    break;
                case 'raStatus':
                    orderByClause = sortFn(reverseAuctions.status);
                    break;
                case 'raStartTime':
                    orderByClause = sortFn(reverseAuctions.raStartTime);
                    break;
                default:
                    orderByClause = sortFn(bidSubmissions.submissionDatetime);
            }
        }

        // Build query with conditional bid submission join
        // For completed tab, bid submissions are not required (matching Laravel)
        const baseQuery = this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                tenderValue: tenderInfos.gstValues,
                teamMemberName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                bidSubmissionId: bidSubmissions.id,
                raId: reverseAuctions.id,
                raStatus: reverseAuctions.status,
                raStartTime: reverseAuctions.raStartTime,
                raEndTime: reverseAuctions.raEndTime,
                technicallyQualified: reverseAuctions.technicallyQualified,
                raResult: reverseAuctions.raResult,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        // Add bid submission join conditionally based on tab
        const query = activeTab === 'completed'
            ? baseQuery.leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            : baseQuery.innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id));

        const finalQuery = query
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        const rows = await finalQuery;

        const data: RaDashboardRow[] = rows.map((row) => ({
            id: row.raId,
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            bidSubmissionDate: row.bidSubmissionDate,
            tenderValue: row.tenderValue,
            itemName: row.itemName,
            tenderStatus: row.tenderStatus,
            raStatus: this.calculateRaStatus(row),
            raStartTime: row.raStartTime,
            raEndTime: row.raEndTime,
            technicallyQualified: row.technicallyQualified,
            result: row.raResult,
            hasRaEntry: row.raId !== null,
        }));

        // Build count query with conditional bid submission join
        const baseCountQuery = this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(
                tenderInformation,
                eq(tenderInformation.tenderId, tenderInfos.id)
            )
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status));

        const countQuery = activeTab === 'completed'
            ? baseCountQuery.leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            : baseCountQuery.innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id));

        const [totalResult] = await countQuery.where(whereClause);

        const total = Number(totalResult?.count || 0);

        const counts = await this.getDashboardCounts();

        const response: RaDashboardResponse = {
            data,
            counts,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };

        return response;
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<RaDashboardCounts> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            inArray(tenderInformation.reverseAuctionApplicable, ['Yes', 'YES']),
            ...roleFilterConditions,
        ];

        // Under-evaluation: No RA OR (RA exists but no result AND no schedule times)
        // Exclude records that have schedule times (they belong in scheduled tab)
        const underEvaluationConditions = [
            ...baseConditions,
            eq(bidSubmissions.status, 'Bid Submitted'),
            or(
                isNull(reverseAuctions.id),
                and(
                    isNull(reverseAuctions.raResult),
                    isNull(reverseAuctions.raStartTime),
                    isNull(reverseAuctions.raEndTime)
                )!
            )!,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Scheduled: RA exists, result is null, and has start/end times (matching getDashboardData logic)
        const scheduledConditions = [
            ...baseConditions,
            eq(bidSubmissions.status, 'Bid Submitted'),
            isNotNull(reverseAuctions.id),
            isNull(reverseAuctions.raResult),
            or(
                isNotNull(reverseAuctions.raStartTime),
                isNotNull(reverseAuctions.raEndTime)
            )!,
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        // Completed: RA exists AND result IS NOT NULL (matching Laravel)
        const completedConditions = [
            ...baseConditions,
            isNotNull(reverseAuctions.id),
            isNotNull(reverseAuctions.raResult),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        ];

        const counts = await Promise.all([
            // Under-evaluation count
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
                .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .where(and(...underEvaluationConditions))
                .then(([result]) => Number(result?.count || 0)),
            // Scheduled count
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
                .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .where(and(...scheduledConditions))
                .then(([result]) => Number(result?.count || 0)),
            // Completed count (no bid submission requirement per Laravel)
            this.db
                .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
                .leftJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .where(and(...completedConditions))
                .then(([result]) => Number(result?.count || 0)),
        ]);

        return {
            underEvaluation: counts[0],
            scheduled: counts[1],
            completed: counts[2],
            total: counts.reduce((sum, count) => sum + count, 0),
        };
    }

    async findAllFromTenders(): Promise<RaDashboardRow[]> {
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                tenderValue: tenderInfos.gstValues,
                teamMemberName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                bidSubmissionId: bidSubmissions.id,
                raId: reverseAuctions.id,
                raStatus: reverseAuctions.status,
                raStartTime: reverseAuctions.raStartTime,
                raEndTime: reverseAuctions.raEndTime,
                technicallyQualified: reverseAuctions.technicallyQualified,
                raResult: reverseAuctions.raResult,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(
                tenderInformation,
                and(
                    eq(tenderInformation.tenderId, tenderInfos.id),
                    inArray(tenderInformation.reverseAuctionApplicable, ['Yes', 'YES'])
                )
            )
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    eq(bidSubmissions.status, 'Bid Submitted'),
                )
            )
            .orderBy(asc(bidSubmissions.submissionDatetime));

        return rows.map((row) => ({
            id: row.raId,
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamMemberName: row.teamMemberName,
            bidSubmissionDate: row.bidSubmissionDate,
            tenderValue: row.tenderValue,
            itemName: row.itemName,
            tenderStatus: row.tenderStatus,
            raStatus: this.calculateRaStatus(row),
            raStartTime: row.raStartTime,
            raEndTime: row.raEndTime,
            technicallyQualified: row.technicallyQualified,
            result: row.raResult,
            hasRaEntry: row.raId !== null,
        }));
    }

    /**
     * Calculate RA status based on RA record and time
     */
    private calculateRaStatus(row: {
        raId: number | null;
        raStatus: string | null;
        technicallyQualified: string | null;
        raStartTime: Date | null;
        raEndTime: Date | null;
        raResult: string | null;
    }): string {
        // No RA entry → Under Evaluation
        if (!row.raId) {
            return RA_STATUS.UNDER_EVALUATION;
        }

        // Has result → Completed status (Won/Lost/Lost H1)
        if (row.raResult) {
            switch (row.raResult) {
                case 'Won':
                    return RA_STATUS.WON;
                case 'Lost':
                    return RA_STATUS.LOST;
                case 'H1 Elimination':
                    return RA_STATUS.LOST_H1;
            }
        }

        // Disqualified → Disqualified
        if (row.technicallyQualified === 'No') {
            return RA_STATUS.DISQUALIFIED;
        }

        // Has schedule times → Check current time to determine RA_STARTED/RA_ENDED/RA_SCHEDULED
        if (row.raStartTime || row.raEndTime) {
            const now = new Date();

            if (row.raEndTime && now >= new Date(row.raEndTime)) {
                return RA_STATUS.RA_ENDED;
            }

            if (row.raStartTime && now >= new Date(row.raStartTime)) {
                return RA_STATUS.RA_STARTED;
            }

            // Has schedule times but not started yet → RA_SCHEDULED
            return RA_STATUS.RA_SCHEDULED;
        }

        // No schedule times, no result → Under Evaluation (matches filtering logic)
        if (!row.raStartTime && !row.raEndTime && !row.raResult) {
            return RA_STATUS.UNDER_EVALUATION;
        }

        // Default to stored status or Under Evaluation
        return row.raStatus || RA_STATUS.UNDER_EVALUATION;
    }

    /**
     * Legacy findAll method for backward compatibility
     */
    async findAll(): Promise<RaDashboardRow[]> {
        return this.findAllFromTenders();
    }

    async findById(id: number) {
        const [result] = await this.db
            .select({
                ra: reverseAuctions,
                tenderName: tenderInfos.tenderName,
                teamMemberName: users.name,
                tenderValue: tenderInfos.gstValues,
                itemName: items.name,
                tenderStatus: statuses.name,
            })
            .from(reverseAuctions)
            .innerJoin(tenderInfos, eq(reverseAuctions.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(eq(reverseAuctions.id, id))
            .limit(1);

        if (!result) {
            throw new NotFoundException('Reverse auction not found');
        }

        return {
            ...result.ra,
            tenderName: result.tenderName,
            teamMemberName: result.teamMemberName,
            tenderValue: result.tenderValue,
            itemName: result.itemName,
            tenderStatus: result.tenderStatus,
        };
    }

    async findByTenderId(tenderId: number) {
        const [result] = await this.db
            .select()
            .from(reverseAuctions)
            .where(eq(reverseAuctions.tenderId, tenderId))
            .limit(1);

        return result || null;
    }

    async getOrCreateForTender(tenderId: number): Promise<{ id: number; isNew: boolean }> {
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            return { id: existing.id, isNew: false };
        }

        const [tender] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender) {
            throw new NotFoundException('Tender not found');
        }

        const [bidSubmission] = await this.db
            .select({ submissionDatetime: bidSubmissions.submissionDatetime })
            .from(bidSubmissions)
            .where(eq(bidSubmissions.tenderId, tenderId))
            .limit(1);

        // Create RA entry
        const [result] = await this.db
            .insert(reverseAuctions)
            .values({
                tenderId: tender.id,
                tenderNo: tender.tenderNo,
                bidSubmissionDate: bidSubmission?.submissionDatetime || new Date(),
                status: RA_STATUS.UNDER_EVALUATION,
            })
            .returning();

        return { id: result.id, isNew: true };
    }

    async createForTender(tenderId: number, bidSubmissionDate: Date) {
        // Get tender info
        const [tender] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        if (!tender) {
            throw new NotFoundException('Tender not found');
        }

        // Check if RA applicable
        const [tenderInfo] = await this.db
            .select({ reverseAuctionApplicable: tenderInformation.reverseAuctionApplicable })
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        if (tenderInfo?.reverseAuctionApplicable !== 'Yes') {
            return null; // Not RA applicable
        }

        // Check if already exists
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            return existing;
        }

        // Create RA entry
        const [result] = await this.db
            .insert(reverseAuctions)
            .values({
                tenderId: tender.id,
                tenderNo: tender.tenderNo,
                bidSubmissionDate: bidSubmissionDate,
                status: RA_STATUS.UNDER_EVALUATION,
            })
            .returning();

        // Also create/update tender_results entry with RA link
        await this.syncToTenderResult(tenderId, result.id, RA_STATUS.UNDER_EVALUATION);

        return result;
    }

    /**
     * Schedule RA - Update with qualification details
     * Creates RA entry if it doesn't exist
     */
    async scheduleRa(tenderId: number, dto: ScheduleRaDto, changedBy: number) {
        // Get current tender status before update
        console.log('scheduleRa service', tenderId, dto, changedBy);
        const currentTender = await this.tenderInfosService.findById(tenderId);
        console.log('currentTender', currentTender);
        const prevStatus = currentTender?.status ?? null;
        console.log('prevStatus', prevStatus);

        let updateData: any = {
            technicallyQualified: dto.technicallyQualified,
            updatedAt: new Date(),
        };

        let newStatus: number | null = null;
        let statusComment: string = '';

        if (dto.technicallyQualified === 'No') {
            // Disqualified
            updateData.status = RA_STATUS.DISQUALIFIED;
            updateData.disqualificationReason = dto.disqualificationReason;
        } else {
            // Qualified - schedule RA
            updateData.status = RA_STATUS.RA_SCHEDULED;
            updateData.qualifiedPartiesCount = dto.qualifiedPartiesCount;
            updateData.qualifiedPartiesNames = dto.qualifiedPartiesNames;
            updateData.raStartTime = dto.raStartTime ? new Date(dto.raStartTime) : null;
            updateData.raEndTime = dto.raEndTime ? new Date(dto.raEndTime) : null;
            updateData.scheduledAt = dto.raStartTime ? new Date(dto.raStartTime) : new Date();

            // AUTO STATUS CHANGE: Update tender status to 23 (RA scheduled)
            newStatus = 23; // Status ID for "RA scheduled"
            statusComment = 'RA scheduled';
        }

        const result = await this.db.transaction(async (tx) => {
            const [inserted] = await tx
                .insert(reverseAuctions)
                .values({
                    tenderId: tenderId,
                    tenderNo: currentTender?.tenderNo ?? '',
                    technicallyQualified: dto.technicallyQualified,
                    disqualificationReason: dto.disqualificationReason,
                    qualifiedPartiesCount: dto.qualifiedPartiesCount,
                    qualifiedPartiesNames: dto.qualifiedPartiesNames,
                    raStartTime: dto.raStartTime ? new Date(dto.raStartTime) : null,
                    raEndTime: dto.raEndTime ? new Date(dto.raEndTime) : null,
                })
                .returning();

            // Sync to tender_results
            await this.syncToTenderResult(tenderId, inserted?.id ?? 0, inserted.status);

            // Update tender status if RA was scheduled
            if (newStatus !== null) {
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

                // Track status change
                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId,
                    newStatus,
                    changedBy,
                    prevStatus,
                    statusComment,
                    tx
                );
            }

            return inserted;
        });

        // Send email notification if RA was scheduled (not disqualified)
        if (dto.technicallyQualified === 'Yes' && result.status === RA_STATUS.RA_SCHEDULED) {
            await this.sendRaScheduledEmail(tenderId, result, changedBy);
        }

        return result;
    }

    /**
     * Upload RA Result
     */
    async uploadResult(raId: number, dto: UploadRaResultDto, changedBy: number) {
        const existing = await this.findById(raId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(existing.tenderId);
        const prevStatus = currentTender?.status ?? null;

        let status: string;
        let newTenderStatus: number | null = null;
        let statusComment: string = '';

        switch (dto.raResult) {
            case 'Won':
                status = RA_STATUS.WON;
                break;
            case 'Lost':
                status = RA_STATUS.LOST;
                break;
            case 'H1 Elimination':
                status = RA_STATUS.LOST_H1;
                // AUTO STATUS CHANGE: Update tender status to 41 (H1 Elimination)
                newTenderStatus = 41; // Status ID for "H1 Elimination"
                statusComment = 'H1 Elimination';
                break;
            default:
                status = existing.status;
        }

        const result = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(reverseAuctions)
                .set({
                    status,
                    raResult: dto.raResult,
                    veL1AtStart: dto.veL1AtStart,
                    raStartPrice: dto.raStartPrice?.toString() ?? null,
                    raClosePrice: dto.raClosePrice?.toString() ?? null,
                    raCloseTime: dto.raCloseTime ? new Date(dto.raCloseTime) : null,
                    screenshotQualifiedParties: dto.screenshotQualifiedParties,
                    screenshotDecrements: dto.screenshotDecrements,
                    finalResultScreenshot: dto.finalResultScreenshot,
                    resultUploadedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(reverseAuctions.id, raId))
                .returning();

            // Sync to tender_results
            await this.syncToTenderResult(existing.tenderId, raId, status);

            // Update tender status if H1 Elimination
            if (newTenderStatus !== null) {
                await tx
                    .update(tenderInfos)
                    .set({ status: newTenderStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, existing.tenderId));

                // Track status change
                await this.tenderStatusHistoryService.trackStatusChange(
                    existing.tenderId,
                    newTenderStatus,
                    changedBy,
                    prevStatus,
                    statusComment,
                    tx
                );
            }

            return updated;
        });

        // Send email notification
        await this.sendRaResultEmail(existing.tenderId, result, changedBy, dto);

        return result;
    }

    async updateRaStartedStatus() {
        const now = new Date();

        const updated = await this.db
            .update(reverseAuctions)
            .set({
                status: RA_STATUS.RA_STARTED,
                updatedAt: now,
            })
            .where(
                and(
                    eq(reverseAuctions.status, RA_STATUS.RA_SCHEDULED),
                    lte(reverseAuctions.raStartTime, now)
                )
            )
            .returning();

        // Sync each updated record to tender_results
        for (const ra of updated) {
            await this.syncToTenderResult(ra.tenderId, ra.id, RA_STATUS.RA_STARTED);
        }

        return updated.length;
    }

    /**
     * Update RA Ended status (called by cron job)
     */
    async updateRaEndedStatus() {
        const now = new Date();

        const updated = await this.db
            .update(reverseAuctions)
            .set({
                status: RA_STATUS.RA_ENDED,
                updatedAt: now,
            })
            .where(
                and(
                    eq(reverseAuctions.status, RA_STATUS.RA_STARTED),
                    lte(reverseAuctions.raEndTime, now)
                )
            )
            .returning();

        // Sync each updated record to tender_results
        for (const ra of updated) {
            await this.syncToTenderResult(ra.tenderId, ra.id, RA_STATUS.RA_ENDED);
        }

        return updated.length;
    }

    private async syncToTenderResult(tenderId: number, raId: number, status: string) {
        // Map RA status to tender_result status
        const statusMapping: Record<string, string> = {
            [RA_STATUS.UNDER_EVALUATION]: 'Under Evaluation',
            [RA_STATUS.RA_SCHEDULED]: 'RA Scheduled',
            [RA_STATUS.DISQUALIFIED]: 'Disqualified',
            [RA_STATUS.RA_STARTED]: 'RA Scheduled',
            [RA_STATUS.RA_ENDED]: 'RA Scheduled',
            [RA_STATUS.WON]: 'Won',
            [RA_STATUS.LOST]: 'Lost',
            [RA_STATUS.LOST_H1]: 'Lost - H1 Elimination',
        };

        const resultStatus = statusMapping[status] || 'Under Evaluation';

        // Check if tender_result exists
        const [existing] = await this.db
            .select()
            .from(tenderResults)
            .where(eq(tenderResults.tenderId, tenderId))
            .limit(1);

        if (existing) {
            await this.db
                .update(tenderResults)
                .set({
                    status: resultStatus,
                    reverseAuctionId: raId,
                    updatedAt: new Date(),
                })
                .where(eq(tenderResults.id, existing.id));
        } else {
            await this.db
                .insert(tenderResults)
                .values({
                    tenderId,
                    status: resultStatus,
                    reverseAuctionId: raId,
                });
        }
    }

    /**
     * Format amount as INR currency
     */
    private formatINR(amount: string | number | null | undefined): string {
        if (amount === null || amount === undefined) return '—';
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return '—';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
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
     * Send RA scheduled email
     */
    private async sendRaScheduledEmail(
        tenderId: number,
        raRecord: { raStartTime: Date | null; raEndTime: Date | null },
        scheduledBy: number
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) return;

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

        // Format RA times
        const raStartTime = raRecord.raStartTime ? new Date(raRecord.raStartTime).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        const raEndTime = raRecord.raEndTime ? new Date(raRecord.raEndTime).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }) : 'Not specified';

        // Calculate time until start
        let timeUntilStart = 'N/A';
        if (raRecord.raStartTime) {
            const now = new Date();
            const startTime = new Date(raRecord.raStartTime);
            const diffMs = startTime.getTime() - now.getTime();
            if (diffMs > 0) {
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                if (diffDays > 0) {
                    timeUntilStart = `${diffDays} day(s) ${diffHours} hour(s)`;
                } else if (diffHours > 0) {
                    timeUntilStart = `${diffHours} hour(s) ${diffMinutes} minute(s)`;
                } else {
                    timeUntilStart = `${diffMinutes} minute(s)`;
                }
            } else {
                timeUntilStart = 'RA has started';
            }
        }

        const emailData = {
            tl_name: tlName,
            tender_no: tender.tenderNo,
            tender_name: tender.tenderName,
            ra_start_time: raStartTime,
            ra_end_time: raEndTime,
            time_until_start: timeUntilStart,
        };

        // Get Both Admins emails
        const bothAdminsEmails = await this.recipientResolver.getBothAdmins(tender.team);

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        await this.sendEmail(
            'ra.scheduled',
            tenderId,
            scheduledBy,
            `RA Scheduled - ${tender.tenderName}`,
            'ra-scheduled',
            emailData,
            {
                to: [{ type: 'emails', emails: bothAdminsEmails }],
                cc: ccRecipients,
            }
        );
    }

    /**
     * Send RA result email
     */
    private async sendRaResultEmail(
        tenderId: number,
        raRecord: {
            raResult: string | null;
            veL1AtStart: string | null;
            raStartPrice: string | null;
            raClosePrice: string | null;
            raStartTime: Date | null;
            raCloseTime: Date | null;
            screenshotQualifiedParties: string | null;
            screenshotDecrements: string | null;
            finalResultScreenshot: string | null;
        },
        uploadedBy: number,
        dto: UploadRaResultDto
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender) return;

        // Format RA duration
        let raDuration = 'N/A';
        if (raRecord.raStartTime && raRecord.raCloseTime) {
            const diffMs = new Date(raRecord.raCloseTime).getTime() - new Date(raRecord.raStartTime).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            raDuration = `${diffHours} hour(s) ${diffMinutes} minute(s)`;
        }

        // Format currency
        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            tender_no: tender.tenderNo,
            tender_name: tender.tenderName,
            ra_result: raRecord.raResult || 'Not specified',
            ve_l1_start_yes: raRecord.veL1AtStart === 'Yes',
            ra_start_price: formatCurrency(raRecord.raStartPrice),
            ra_close_price: formatCurrency(raRecord.raClosePrice),
            ra_duration: raDuration,
            qualified_parties_screenshot: !!raRecord.screenshotQualifiedParties,
            decrements_screenshot: !!raRecord.screenshotDecrements,
            final_result: !!raRecord.finalResultScreenshot,
            isWon: raRecord.raResult === 'Won',
            isLost: raRecord.raResult === 'Lost',
            isH1Elimination: raRecord.raResult === 'H1 Elimination',
        };

        // Get Both Admins emails
        const bothAdminsEmails = await this.recipientResolver.getBothAdmins(tender.team);

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [
            { type: 'emails', emails: bothAdminsEmails },
            { type: 'role', role: 'Coordinator', teamId: tender.team },
        ];

        await this.sendEmail(
            'ra.result',
            tenderId,
            uploadedBy,
            `RA Result - ${tender.tenderName}`,
            'ra-result',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: ccRecipients,
            }
        );
    }
}
