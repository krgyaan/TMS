import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, inArray, sql, isNull, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { bidSubmissions, bidSubmissionStatusEnum } from '@db/schemas/tendering/bid-submissions.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import {
    paymentRequests,
    paymentInstruments,
} from '@db/schemas/tendering/emds.schema';
import { TenderInfosService, type PaginatedResult } from '@/modules/tendering/tenders/tenders.service';
import { UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';

export type ResultDashboardType = 'pending' | 'won' | 'lost' | 'disqualified';

export type ResultDashboardFilters = {
    type?: ResultDashboardType;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
};

export type ResultDashboardRow = {
    id: number | null;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    teamExecutiveName: string | null;
    bidSubmissionDate: Date | null;
    tenderValue: string | null;
    finalPrice: string | null;
    itemName: string | null;
    tenderStatus: string | null;
    resultStatus: string | null;
    emdDetails: EmdDetails | null;
    hasResultEntry: boolean;
};

export type EmdDetails = {
    amount: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayText: string;
};

const RESULT_STATUS = {
    RESULT_AWAITED: 'Result Awaited',
    UNDER_EVALUATION: 'Under Evaluation',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
    DISQUALIFIED: 'Disqualified',
} as const;

@Injectable()
export class TenderResultService {
    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
    ) { }

    async findAll(filters?: ResultDashboardFilters): Promise<PaginatedResult<ResultDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        let orderByClause: any = desc(bidSubmissions.submissionDatetime);

        // Build dynamic order by clause based on filters
        if (filters?.sortBy) {
            const sortOrder = filters.sortOrder === 'desc' ? desc : asc;
            switch (filters.sortBy) {
                case 'tenderNo':
                    orderByClause = sortOrder(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderByClause = sortOrder(tenderInfos.tenderName);
                    break;
                case 'teamExecutiveName':
                    orderByClause = sortOrder(users.name);
                    break;
                case 'bidSubmissionDate':
                    orderByClause = sortOrder(bidSubmissions.submissionDatetime);
                    break;
                case 'finalPrice':
                    orderByClause = sortOrder(tenderCostingSheets.finalPrice);
                    break;
                case 'itemName':
                    orderByClause = sortOrder(items.name);
                    break;
                case 'tenderStatus':
                    orderByClause = sortOrder(statuses.name);
                    break;
                default:
                    orderByClause = desc(bidSubmissions.submissionDatetime);
            }
        }

        // Build type filter condition
        let typeFilter: any = null;
        if (filters?.type) {
            switch (filters.type) {
                case 'pending':
                    // Result Awaited or null status (no result entry created yet)
                    typeFilter = or(
                        isNull(tenderResults.status),
                        eq(tenderResults.status, RESULT_STATUS.RESULT_AWAITED)
                    );
                    break;
                case 'won':
                    typeFilter = eq(tenderResults.status, RESULT_STATUS.WON);
                    break;
                case 'lost':
                    // Lost or Lost - H1 Elimination
                    typeFilter = inArray(tenderResults.status, [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1]);
                    break;
                case 'disqualified':
                    typeFilter = eq(tenderResults.status, RESULT_STATUS.DISQUALIFIED);
                    break;
            }
        }

        // Build where conditions
        const whereConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb']),
            eq(bidSubmissions.status, bidSubmissionStatusEnum.enumValues[1])
        ];

        if (typeFilter) {
            whereConditions.push(typeFilter);
        }

        // Fetch the rows from the database with DISTINCT to avoid duplicates
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                tenderValue: tenderInfos.gstValues,
                emdAmount: tenderInfos.emd,
                teamExecutiveName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,
                tenderCategory: statuses.tenderCategory,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                costingFinalPrice: tenderCostingSheets.finalPrice,
                resultId: tenderResults.id,
                resultStatus: tenderResults.status,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(...whereConditions))
            .orderBy(orderByClause)
            .limit(limit)
            .offset(offset);

        // If no rows, return empty data
        if (!rows || rows.length === 0) {
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

        const tenderIds = rows.map((r) => r.tenderId);
        const emdDetailsMap = await this.getEmdDetailsForTenders(tenderIds);

        // Map the rows to the desired structure
        const data = rows.map((row) => ({
            id: row.resultId,
            tenderId: row.tenderId,
            tenderNo: row.tenderNo,
            tenderName: row.tenderName,
            teamExecutiveName: row.teamExecutiveName,
            bidSubmissionDate: row.bidSubmissionDate,
            tenderValue: row.tenderValue,
            finalPrice: row.costingFinalPrice || row.tenderValue,
            itemName: row.itemName,
            tenderStatus: row.tenderStatus,
            resultStatus: row.resultStatus || '', // Ensure the result status is not null
            emdDetails: this.formatEmdDetails(row.emdAmount, emdDetailsMap.get(row.tenderId)),
            hasResultEntry: row.resultId !== null,
        }));

        // Get the total number of matching rows
        const totalRows = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(and(...whereConditions));

        const total = Number(totalRows[0]?.count || 0);

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


    private async getEmdDetailsForTenders(
        tenderIds: number[]
    ): Promise<Map<number, { type: string; status: string }>> {
        if (tenderIds.length === 0) {
            return new Map();
        }

        const emdMap = new Map<number, { type: string; status: string }>();

        const results = await this.db
            .select({
                tenderId: paymentRequests.tenderId,
                instrumentType: paymentInstruments.instrumentType,
                instrumentStatus: paymentInstruments.status,
            })
            .from(paymentRequests)
            .innerJoin(
                paymentInstruments,
                and(
                    eq(paymentInstruments.requestId, paymentRequests.id),
                    eq(paymentInstruments.isActive, true)
                )
            )
            .where(
                and(
                    inArray(paymentRequests.tenderId, tenderIds),
                    eq(paymentRequests.purpose, 'EMD')
                )
            );

        for (const result of results) {
            if (!emdMap.has(result.tenderId)) {
                emdMap.set(result.tenderId, {
                    type: result.instrumentType,
                    status: result.instrumentStatus,
                });
            }
        }

        return emdMap;
    }

    private formatEmdDetails(
        emdAmount: string | null,
        instrumentDetails?: { type: string; status: string }
    ): EmdDetails | null {
        const amount = Number(emdAmount) || 0;

        if (amount <= 0) {
            return {
                amount: '0',
                instrumentType: null,
                instrumentStatus: null,
                displayText: 'Not Applicable',
            };
        }

        if (!instrumentDetails) {
            return {
                amount: emdAmount || '0',
                instrumentType: null,
                instrumentStatus: null,
                displayText: 'Not Requested',
            };
        }

        const displayStatus = this.mapInstrumentStatusToDisplay(instrumentDetails.status);

        return {
            amount: emdAmount || '0',
            instrumentType: instrumentDetails.type,
            instrumentStatus: instrumentDetails.status,
            displayText: `${instrumentDetails.type} (${displayStatus})`,
        };
    }

    private mapInstrumentStatusToDisplay(status: string): string {
        const upperStatus = status.toUpperCase();

        if (upperStatus.includes('REJECTED')) return 'Rejected';
        if (upperStatus.includes('RETURNED') || upperStatus.includes('RECEIVED')) return 'Returned';
        if (upperStatus.includes('APPROVED') || upperStatus.includes('ACCEPTED')) return 'Approved';
        if (upperStatus.includes('COMPLETED') || upperStatus.includes('CONFIRMED')) return 'Completed';
        if (upperStatus.includes('SUBMITTED') || upperStatus.includes('INITIATED')) return 'Submitted';
        if (upperStatus.includes('PENDING')) return 'Pending';

        return status;
    }

    async findById(id: number) {
        const [result] = await this.db
            .select({
                result: tenderResults,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamExecutiveName: users.name,
                tenderValue: tenderInfos.gstValues,
                costingFinalPrice: tenderCostingSheets.finalPrice,
                itemName: items.name,
                tenderStatus: statuses.name,
                reverseAuctionApplicable: tenderInformation.reverseAuctionApplicable,
            })
            .from(tenderResults)
            .innerJoin(tenderInfos, eq(tenderResults.tenderId, tenderInfos.id))
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(eq(tenderResults.id, id))
            .limit(1);

        if (!result) {
            throw new NotFoundException('Tender result not found');
        }

        return {
            ...result.result,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            teamExecutiveName: result.teamExecutiveName,
            tenderValue: result.tenderValue,
            finalPrice: result.costingFinalPrice || result.tenderValue,
            itemName: result.itemName,
            tenderStatus: result.tenderStatus,
            raApplicable: result.reverseAuctionApplicable === 'Yes',
        };
    }

    async findByTenderId(tenderId: number) {
        const [result] = await this.db
            .select()
            .from(tenderResults)
            .where(eq(tenderResults.tenderId, tenderId))
            .limit(1);

        return result || null;
    }

    async getOrCreateForTender(tenderId: number): Promise<{ id: number; isNew: boolean }> {
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            return { id: existing.id, isNew: false };
        }

        const [result] = await this.db
            .insert(tenderResults)
            .values({
                tenderId,
                status: RESULT_STATUS.UNDER_EVALUATION,
            })
            .returning();

        return { id: result.id, isNew: true };
    }

    async createForTender(tenderId: number) {
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            return existing;
        }

        const [result] = await this.db
            .insert(tenderResults)
            .values({
                tenderId,
                status: RESULT_STATUS.UNDER_EVALUATION,
            })
            .returning();

        return result;
    }

    async uploadResult(id: number | null, tenderId: number, dto: UploadResultDto, changedBy: number) {
        let resultId = id;

        if (!resultId) {
            const result = await this.getOrCreateForTender(tenderId);
            resultId = result.id;
        }

        const existing = await this.findById(resultId);

        if (existing.raApplicable && existing.reverseAuctionId) {
            throw new BadRequestException(
                'This tender has RA applicable. Please upload result through RA Dashboard.'
            );
        }

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
            updateData.status = RESULT_STATUS.DISQUALIFIED;
            updateData.disqualificationReason = dto.disqualificationReason;
            // AUTO STATUS CHANGE: Update tender status to 22 (Disqualified)
            newStatus = 22; // Status ID for "Disqualified (reason)"
            statusComment = 'Disqualified';
        } else {
            updateData.status = dto.result === 'Won' ? RESULT_STATUS.WON : RESULT_STATUS.LOST;
            updateData.qualifiedPartiesCount = dto.qualifiedPartiesCount;
            updateData.qualifiedPartiesNames = dto.qualifiedPartiesNames;
            updateData.result = dto.result;
            updateData.l1Price = dto.l1Price;
            updateData.l2Price = dto.l2Price;
            updateData.ourPrice = dto.ourPrice;
            updateData.qualifiedPartiesScreenshot = dto.qualifiedPartiesScreenshot;
            updateData.finalResultScreenshot = dto.finalResultScreenshot;
            updateData.resultUploadedAt = new Date();

            if (dto.result === 'Won') {
                // AUTO STATUS CHANGE: Update tender status to 25 (Won (PO awaited))
                newStatus = 25; // Status ID for "Won (PO awaited)"
                statusComment = 'Won (PO awaited)';
            } else if (dto.result === 'Lost') {
                // AUTO STATUS CHANGE: Update tender status to 24 (Lost)
                newStatus = 24; // Status ID for "Lost (Price Bid result to be uploaded)"
                statusComment = 'Lost';
            }
        }

        const result = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(tenderResults)
                .set(updateData)
                .where(eq(tenderResults.id, resultId))
                .returning();

            // Update tender status if status change is needed
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
                    statusComment
                );
            }

            return updated;
        });

        return result;
    }

    async getLinkedRaDetails(id: number) {
        const result = await this.findById(id);

        if (!result.reverseAuctionId) {
            return null;
        }

        const [ra] = await this.db
            .select()
            .from(reverseAuctions)
            .where(eq(reverseAuctions.id, result.reverseAuctionId))
            .limit(1);

        return ra || null;
    }
}
