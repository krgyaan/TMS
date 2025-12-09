import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, lte, asc } from 'drizzle-orm';
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
import { ScheduleRaDto, UploadRaResultDto } from '@/modules/tendering/reverse-auction/dto/reverse-auction.dto';

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
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    /**
     * Get RA Dashboard data with counts for all tabs
     */
    async getDashboardData(type?: RaDashboardType): Promise<RaDashboardResponse> {
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

        return { data: filteredData, counts };
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
                // Tender Info
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                tenderValue: tenderInfos.gstValues,

                // Related data
                teamMemberName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,

                // Bid submission
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                bidSubmissionId: bidSubmissions.id,

                // RA data (may be null if not created yet)
                raId: reverseAuctions.id,
                raStatus: reverseAuctions.status,
                raStartTime: reverseAuctions.raStartTime,
                raEndTime: reverseAuctions.raEndTime,
                technicallyQualified: reverseAuctions.technicallyQualified,
                raResult: reverseAuctions.raResult,
            })
            .from(tenderInfos)
            // Join user
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            // Join tender information to check RA applicable
            .innerJoin(
                tenderInformation,
                and(
                    eq(tenderInformation.tenderId, tenderInfos.id),
                    eq(tenderInformation.reverseAuctionApplicable, 'Yes')
                )
            )
            // Join bid submissions - must have bid submitted
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            // Left join RA (may not exist yet)
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            // Left join other related data
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    // Base filters
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb'])
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
            // Calculate RA status
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
        // If no RA record exists, status is "Under Evaluation"
        if (!row.raId) {
            return RA_STATUS.UNDER_EVALUATION;
        }

        // If RA record exists but no status, default to "Under Evaluation"
        if (!row.raStatus) {
            return RA_STATUS.UNDER_EVALUATION;
        }

        // Check for completed statuses first
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

        // Check for disqualification
        if (row.technicallyQualified === 'No') {
            return RA_STATUS.DISQUALIFIED;
        }

        // Check time-based statuses (real-time calculation)
        if (row.raStartTime || row.raEndTime) {
            const now = new Date();

            if (row.raEndTime && now >= new Date(row.raEndTime)) {
                return RA_STATUS.RA_ENDED;
            }

            if (row.raStartTime && now >= new Date(row.raStartTime)) {
                return RA_STATUS.RA_STARTED;
            }
        }

        // If technically qualified, RA is scheduled
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
    async scheduleRa(id: number | null, tenderId: number, dto: ScheduleRaDto) {
        let raId = id;

        // If no RA ID provided, get or create one
        if (!raId) {
            const result = await this.getOrCreateForTender(tenderId);
            raId = result.id;
        }

        const existing = await this.findById(raId);

        let updateData: any = {
            technicallyQualified: dto.technicallyQualified,
            updatedAt: new Date(),
        };

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
        }

        const [result] = await this.db
            .update(reverseAuctions)
            .set(updateData)
            .where(eq(reverseAuctions.id, raId))
            .returning();

        // Sync to tender_results
        await this.syncToTenderResult(existing.tenderId, raId, result.status);

        return result;
    }

    /**
     * Upload RA Result
     */
    async uploadResult(id: number, dto: UploadRaResultDto) {
        const existing = await this.findById(id);

        let status: string;
        switch (dto.raResult) {
            case 'Won':
                status = RA_STATUS.WON;
                break;
            case 'Lost':
                status = RA_STATUS.LOST;
                break;
            case 'H1 Elimination':
                status = RA_STATUS.LOST_H1;
                break;
            default:
                status = existing.status;
        }

        const [result] = await this.db
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
}
