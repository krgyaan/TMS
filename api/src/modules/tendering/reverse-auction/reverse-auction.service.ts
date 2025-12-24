import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { ScheduleRaDto, UploadRaResultDto } from '@/modules/tendering/reverse-auction/dto/reverse-auction.dto';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';

export type RaDashboardFilters = {
    type?: RaDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
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

const STATUS_GROUPS = {
    underEvaluation: [RA_STATUS.UNDER_EVALUATION],
    scheduled: [RA_STATUS.RA_SCHEDULED, RA_STATUS.RA_STARTED, RA_STATUS.RA_ENDED],
    completed: [RA_STATUS.WON, RA_STATUS.LOST, RA_STATUS.LOST_H1, RA_STATUS.DISQUALIFIED],
};

@Injectable()
export class ReverseAuctionService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
    ) { }

    /**
     * Get RA Dashboard data with counts for all tabs
     */
    async getDashboardData(type?: RaDashboardType, filters?: RaDashboardFilters): Promise<RaDashboardResponse> {
        const allData = await this.findAllFromTenders();
        const counts = this.calculateCounts(allData);

        let filteredData: RaDashboardRow[];

        switch (type) {
            case 'under-evaluation':
                filteredData = allData.filter((r) =>
                    STATUS_GROUPS.underEvaluation.includes(r.raStatus as any)
                );
                break;
            case 'scheduled':
                filteredData = allData.filter((r) =>
                    STATUS_GROUPS.scheduled.includes(r.raStatus as any)
                );
                break;
            case 'completed':
                filteredData = allData.filter((r) =>
                    STATUS_GROUPS.completed.includes(r.raStatus as any)
                );
                break;
            default:
                filteredData = allData;
        }

        // Apply sorting
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
            filteredData.sort((a, b) => {
                let aVal: any;
                let bVal: any;

                switch (filters.sortBy) {
                    case 'tenderNo':
                        aVal = a.tenderNo || '';
                        bVal = b.tenderNo || '';
                        break;
                    case 'tenderName':
                        aVal = a.tenderName || '';
                        bVal = b.tenderName || '';
                        break;
                    case 'teamMemberName':
                        aVal = a.teamMemberName || '';
                        bVal = b.teamMemberName || '';
                        break;
                    case 'bidSubmissionDate':
                        aVal = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
                        bVal = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
                        break;
                    case 'tenderValue':
                        aVal = parseFloat(a.tenderValue || '0');
                        bVal = parseFloat(b.tenderValue || '0');
                        break;
                    case 'raStatus':
                        aVal = a.raStatus || '';
                        bVal = b.raStatus || '';
                        break;
                    case 'raStartTime':
                        aVal = a.raStartTime ? new Date(a.raStartTime).getTime() : 0;
                        bVal = b.raStartTime ? new Date(b.raStartTime).getTime() : 0;
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return -1 * sortOrder;
                if (aVal > bVal) return 1 * sortOrder;
                return 0;
            });
        }

        // Apply pagination
        const total = filteredData.length;
        let paginatedData = filteredData;
        if (filters?.page && filters?.limit) {
            const page = filters.page;
            const limit = filters.limit;
            const offset = (page - 1) * limit;
            paginatedData = filteredData.slice(offset, offset + limit);
        }

        const response: RaDashboardResponse = {
            data: paginatedData,
            counts,
        };

        if (filters?.page && filters?.limit) {
            response.meta = {
                total,
                page: filters.page,
                limit: filters.limit,
                totalPages: Math.ceil(total / filters.limit),
            };
        }

        return response;
    }

    async getDashboardCounts(): Promise<RaDashboardCounts> {
        const allData = await this.findAllFromTenders();
        return this.calculateCounts(allData);
    }

    private calculateCounts(data: RaDashboardRow[]): RaDashboardCounts {
        const counts: RaDashboardCounts = {
            underEvaluation: 0,
            scheduled: 0,
            completed: 0,
            total: data.length,
        };

        for (const row of data) {
            if (STATUS_GROUPS.underEvaluation.includes(row.raStatus as any)) {
                counts.underEvaluation++;
            } else if (STATUS_GROUPS.scheduled.includes(row.raStatus as any)) {
                counts.scheduled++;
            } else if (STATUS_GROUPS.completed.includes(row.raStatus as any)) {
                counts.completed++;
            }
        }

        return counts;
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
                    eq(tenderInformation.reverseAuctionApplicable, '1')
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
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost'])
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
        if (!row.raId) {
            return RA_STATUS.UNDER_EVALUATION;
        }

        if (!row.raStatus) {
            return RA_STATUS.UNDER_EVALUATION;
        }

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

        if (row.technicallyQualified === 'No') {
            return RA_STATUS.DISQUALIFIED;
        }

        if (row.raStartTime || row.raEndTime) {
            const now = new Date();

            if (row.raEndTime && now >= new Date(row.raEndTime)) {
                return RA_STATUS.RA_ENDED;
            }

            if (row.raStartTime && now >= new Date(row.raStartTime)) {
                return RA_STATUS.RA_STARTED;
            }
        }

        if (row.technicallyQualified === 'Yes') {
            return RA_STATUS.RA_SCHEDULED;
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
    async scheduleRa(id: number | null, tenderId: number, dto: ScheduleRaDto, changedBy: number) {
        let raId = id;

        // If no RA ID provided, get or create one
        if (!raId) {
            const result = await this.getOrCreateForTender(tenderId);
            raId = result.id;
        }

        const existing = await this.findById(raId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

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
            updateData.scheduledAt = new Date();

            // AUTO STATUS CHANGE: Update tender status to 23 (RA scheduled)
            newStatus = 23; // Status ID for "RA scheduled"
            statusComment = 'RA scheduled';
        }

        const result = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(reverseAuctions)
                .set(updateData)
                .where(eq(reverseAuctions.id, raId))
                .returning();

            // Sync to tender_results
            await this.syncToTenderResult(existing.tenderId, raId, updated.status);

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

            return updated;
        });

        return result;
    }

    /**
     * Upload RA Result
     */
    async uploadResult(id: number, dto: UploadRaResultDto, changedBy: number) {
        const existing = await this.findById(id);

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
                    raStartPrice: dto.raStartPrice,
                    raClosePrice: dto.raClosePrice,
                    raCloseTime: dto.raCloseTime ? new Date(dto.raCloseTime) : null,
                    screenshotQualifiedParties: dto.screenshotQualifiedParties,
                    screenshotDecrements: dto.screenshotDecrements,
                    finalResultScreenshot: dto.finalResultScreenshot,
                    resultUploadedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(reverseAuctions.id, id))
                .returning();

            // Sync to tender_results
            await this.syncToTenderResult(existing.tenderId, id, status);

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
     * Get RA Dashboard data - Updated implementation per requirements
     * Type: 'pending' = raResult IS NULL, 'completed' = raResult IS NOT NULL
     */
    async getRaData(
        type?: 'pending' | 'completed',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<RaDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb']),
            eq(tenderInformation.reverseAuctionApplicable, 'Yes'),
        ];

        // Add type filter
        if (type === 'pending') {
            baseConditions.push(
                or(
                    isNull(reverseAuctions.raResult),
                    isNull(reverseAuctions.id)
                )!
            );
        } else if (type === 'completed') {
            baseConditions.push(isNotNull(reverseAuctions.raResult));
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
                case 'teamMemberName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'bidSubmissionDate':
                    orderByClause = sortOrder(bidSubmissions.submissionDatetime);
                    break;
                case 'tenderValue':
                    orderByClause = sortOrder(tenderInfos.gstValues);
                    break;
                case 'raStatus':
                    orderByClause = sortOrder(reverseAuctions.status);
                    break;
                default:
                    orderByClause = asc(bidSubmissions.submissionDatetime);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(tenderInformation, and(
                eq(tenderInformation.tenderId, tenderInfos.id),
                eq(tenderInformation.reverseAuctionApplicable, 'Yes')
            ))
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                teamMemberName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                raId: reverseAuctions.id,
                raStatus: reverseAuctions.status,
                raStartTime: reverseAuctions.raStartTime,
                raEndTime: reverseAuctions.raEndTime,
                raResult: reverseAuctions.raResult,
            })
            .from(tenderInfos)
            .innerJoin(tenderInformation, and(
                eq(tenderInformation.tenderId, tenderInfos.id),
                eq(tenderInformation.reverseAuctionApplicable, 'Yes')
            ))
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        const data: RaDashboardRow[] = rows.map((row) => ({
            id: row.raId,
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: `${row.tenderName} - ${row.tenderNo}`,
            teamMemberName: row.teamMemberName,
            bidSubmissionDate: row.bidSubmissionDate,
            tenderValue: this.formatINR(row.gstValues),
            itemName: row.itemName,
            tenderStatus: row.tenderStatus,
            raStatus: this.calculateRaStatus({
                raId: row.raId,
                raStatus: row.raStatus,
                technicallyQualified: null,
                raStartTime: row.raStartTime,
                raEndTime: row.raEndTime,
                raResult: row.raResult,
            }),
            raStartTime: row.raStartTime,
            raEndTime: row.raEndTime,
            technicallyQualified: null,
            result: row.raResult,
            hasRaEntry: row.raId !== null,
        }));

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
}
