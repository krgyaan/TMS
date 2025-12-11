import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, or, isNull, inArray, ne, sql } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
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

export type ResultDashboardType = 'pending' | 'won' | 'lost';

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
    resultStatus: string;
    raApplicable: boolean;
    reverseAuctionId: number | null;
    raStatus: string | null;
    emdDetails: EmdDetails | null;
    hasResultEntry: boolean;
};

export type EmdDetails = {
    amount: string;
    instrumentType: string | null;
    instrumentStatus: string | null;
    displayText: string;
};

export type ResultDashboardResponse = PaginatedResult<ResultDashboardRow> & {
    counts: ResultDashboardCounts;
};

export type ResultDashboardCounts = {
    pending: number;
    won: number;
    lost: number;
    total: number;
};

const RESULT_STATUS = {
    RESULT_AWAITED: 'Result Awaited',
    UNDER_EVALUATION: 'Under Evaluation',
    WON: 'Won',
    LOST: 'Lost',
    LOST_H1: 'Lost - H1 Elimination',
    DISQUALIFIED: 'Disqualified',
} as const;

const RA_COMPLETED_STATUSES = ['Won', 'Lost', 'Lost - H1 Elimination', 'Disqualified'];

@Injectable()
export class TenderResultService {
    constructor(@Inject(DRIZZLE) private readonly db: DbInstance) { }

    async getDashboardData(filters?: ResultDashboardFilters): Promise<ResultDashboardResponse> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const allData = await this.findAllFromTenders(filters);
        const counts = this.calculateCounts(allData);

        let filteredData: ResultDashboardRow[];

        switch (filters?.type) {
            case 'pending':
                filteredData = allData.filter(
                    (r) => r.resultStatus === RESULT_STATUS.RESULT_AWAITED ||
                        r.resultStatus === RESULT_STATUS.UNDER_EVALUATION
                );
                break;
            case 'won':
                filteredData = allData.filter((r) => r.resultStatus === RESULT_STATUS.WON);
                break;
            case 'lost':
                filteredData = allData.filter((r) =>
                    [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1, RESULT_STATUS.DISQUALIFIED].includes(
                        r.resultStatus as any
                    )
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
                        aVal = a.tenderNo;
                        bVal = b.tenderNo;
                        break;
                    case 'tenderName':
                        aVal = a.tenderName;
                        bVal = b.tenderName;
                        break;
                    case 'teamExecutiveName':
                        aVal = a.teamExecutiveName || '';
                        bVal = b.teamExecutiveName || '';
                        break;
                    case 'bidSubmissionDate':
                        aVal = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
                        bVal = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
                        break;
                    case 'finalPrice':
                        aVal = parseFloat(a.finalPrice || a.tenderValue || '0');
                        bVal = parseFloat(b.finalPrice || b.tenderValue || '0');
                        break;
                    case 'itemName':
                        aVal = a.itemName || '';
                        bVal = b.itemName || '';
                        break;
                    case 'tenderStatus':
                        aVal = a.tenderStatus || '';
                        bVal = b.tenderStatus || '';
                        break;
                    case 'resultStatus':
                        aVal = a.resultStatus || '';
                        bVal = b.resultStatus || '';
                        break;
                    default:
                        return 0;
                }

                if (aVal < bVal) return -1 * sortOrder;
                if (aVal > bVal) return 1 * sortOrder;
                return 0;
            });
        } else {
            // Default sort by bidSubmissionDate descending
            filteredData.sort((a, b) => {
                const aDate = a.bidSubmissionDate ? new Date(a.bidSubmissionDate).getTime() : 0;
                const bDate = b.bidSubmissionDate ? new Date(b.bidSubmissionDate).getTime() : 0;
                return bDate - aDate;
            });
        }

        // Apply pagination
        const totalFiltered = filteredData.length;
        const paginatedData = filteredData.slice(offset, offset + limit);

        return {
            data: paginatedData,
            meta: {
                total: totalFiltered,
                page,
                limit,
                totalPages: Math.ceil(totalFiltered / limit),
            },
            counts,
        };
    }

    async getDashboardCounts(): Promise<ResultDashboardCounts> {
        const allData = await this.findAllFromTenders();
        return this.calculateCounts(allData);
    }

    private calculateCounts(data: ResultDashboardRow[]): ResultDashboardCounts {
        const counts: ResultDashboardCounts = {
            pending: 0,
            won: 0,
            lost: 0,
            total: data.length,
        };

        for (const row of data) {
            if (
                row.resultStatus === RESULT_STATUS.RESULT_AWAITED ||
                row.resultStatus === RESULT_STATUS.UNDER_EVALUATION
            ) {
                counts.pending++;
            } else if (row.resultStatus === RESULT_STATUS.WON) {
                counts.won++;
            } else if (
                [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1, RESULT_STATUS.DISQUALIFIED].includes(
                    row.resultStatus as any
                )
            ) {
                counts.lost++;
            }
        }

        return counts;
    }

    /**
     * Get Result Dashboard data - Updated implementation per requirements
     * Type logic based on status codes and tenderResults existence
     */
    async getResultData(
        type?: 'pending' | 'won' | 'lost' | 'disqualified',
        filters?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PaginatedResult<ResultDashboardRow>> {
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        // Build base conditions
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb']),
        ];

        // Add type-specific filters
        if (type === 'pending') {
            // Status codes 17, 19, 20, 23 AND no tenderResults record
            baseConditions.push(
                inArray(tenderInfos.status, [17, 19, 20, 23]),
                isNull(tenderResults.id)
            );
        } else if (type === 'won') {
            // Status codes 25, 26, 27, 28 from tenderResults
            baseConditions.push(
                or(
                    inArray(tenderInfos.status, [25, 26, 27, 28]),
                    eq(tenderResults.result, 'Won'),
                    eq(tenderResults.status, 'Won')
                )!
            );
        } else if (type === 'lost') {
            // Status codes 18, 21, 24 from tenderResults
            baseConditions.push(
                or(
                    inArray(tenderInfos.status, [18, 21, 24]),
                    eq(tenderResults.result, 'Lost'),
                    eq(tenderResults.status, 'Lost')
                )!
            );
        } else if (type === 'disqualified') {
            // Status codes 22, 38 from tenderResults
            baseConditions.push(
                or(
                    inArray(tenderInfos.status, [22, 38]),
                    eq(tenderResults.status, 'Disqualified'),
                    eq(tenderResults.result, 'Disqualified')
                )!
            );
        }

        const whereClause = and(...baseConditions);

        // Build orderBy clause
        let orderByClause: any = desc(bidSubmissions.submissionDatetime); // Default
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
                case 'finalPrice':
                    orderByClause = sortOrder(tenderCostingSheets.finalPrice);
                    break;
                default:
                    orderByClause = desc(bidSubmissions.submissionDatetime);
            }
        }

        // Get total count
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                emdAmount: tenderInfos.emd,
                teamMemberName: users.name,
                itemName: items.name,
                tenderStatus: statuses.name,
                bidSubmissionDate: bidSubmissions.submissionDatetime,
                finalPrice: tenderCostingSheets.finalPrice,
                resultId: tenderResults.id,
                resultStatus: tenderResults.status,
                resultResult: tenderResults.result,
            })
            .from(tenderInfos)
            .innerJoin(bidSubmissions, and(
                eq(bidSubmissions.tenderId, tenderInfos.id),
                eq(bidSubmissions.status, 'Bid Submitted')
            ))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(orderByClause);

        // Get EMD details
        const tenderIds = rows.map((r) => r.tenderId);
        const emdDetailsMap = await this.getEmdDetailsForTenders(tenderIds);

        const data: ResultDashboardRow[] = rows.map((row) => {
            const resultStatus = this.calculateResultStatusForType(row, type);
            return {
                id: row.resultId,
                tenderId: row.tenderId,
                tenderNo: row.tenderNo,
                tenderName: `${row.tenderName} - ${row.tenderNo}`,
                teamExecutiveName: row.teamMemberName,
                bidSubmissionDate: row.bidSubmissionDate,
                tenderValue: this.formatINR(row.gstValues),
                finalPrice: row.finalPrice || row.gstValues,
                itemName: row.itemName,
                tenderStatus: row.tenderStatus,
                resultStatus,
                emdDetails: this.formatEmdDetails(row.emdAmount, emdDetailsMap.get(row.tenderId)),
                raApplicable: false,
                reverseAuctionId: null,
                raStatus: null,
                hasResultEntry: row.resultId !== null,
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

    /**
     * Calculate result status based on type parameter
     */
    private calculateResultStatusForType(
        row: {
            resultStatus: string | null;
            resultResult: string | null;
        },
        type?: string
    ): string {
        if (type === 'pending') return RESULT_STATUS.RESULT_AWAITED;
        if (type === 'won') return RESULT_STATUS.WON;
        if (type === 'lost') return RESULT_STATUS.LOST;
        if (type === 'disqualified') return RESULT_STATUS.DISQUALIFIED;

        if (row.resultResult === 'Won' || row.resultStatus === 'Won') return RESULT_STATUS.WON;
        if (row.resultResult === 'Lost' || row.resultStatus === 'Lost') return RESULT_STATUS.LOST;
        if (row.resultStatus === 'Disqualified') return RESULT_STATUS.DISQUALIFIED;

        return RESULT_STATUS.RESULT_AWAITED;
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

    async findAllFromTenders(filters?: ResultDashboardFilters): Promise<ResultDashboardRow[]> {
        // Build orderBy clause based on sortBy (if it's a database field)
        let orderByClause: any = desc(bidSubmissions.submissionDatetime); // Default

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

                reverseAuctionApplicable: tenderInformation.reverseAuctionApplicable,

                // Result data (may be null)
                resultId: tenderResults.id,
                resultStatus: tenderResults.status,
                resultTechnicallyQualified: tenderResults.technicallyQualified,
                resultResult: tenderResults.result,

                // RA data (may be null)
                raId: reverseAuctions.id,
                raStatus: reverseAuctions.status,
                raResult: reverseAuctions.raResult,
            })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(reverseAuctions, eq(reverseAuctions.tenderId, tenderInfos.id))
            .leftJoin(tenderCostingSheets, eq(tenderCostingSheets.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb']),
                    // Filter: Either not RA applicable OR RA is completed
                    or(
                        // Not RA applicable
                        ne(tenderInformation.reverseAuctionApplicable, 'Yes'),
                        isNull(tenderInformation.reverseAuctionApplicable),
                        // RA applicable and completed
                        and(
                            eq(tenderInformation.reverseAuctionApplicable, 'Yes'),
                            inArray(reverseAuctions.status, RA_COMPLETED_STATUSES)
                        )
                    )
                )
            )
            .orderBy(orderByClause);

        // Get EMD details for all tenders
        const tenderIds = rows.map((r) => r.tenderId);
        const emdDetailsMap = await this.getEmdDetailsForTenders(tenderIds);

        return rows.map((row) => {
            const isRaApplicable = row.reverseAuctionApplicable === 'Yes';

            return {
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
                resultStatus: this.calculateResultStatus(row, isRaApplicable),
                raApplicable: isRaApplicable,
                reverseAuctionId: row.raId,
                raStatus: row.raStatus,
                emdDetails: this.formatEmdDetails(row.emdAmount, emdDetailsMap.get(row.tenderId)),
                hasResultEntry: row.resultId !== null,
            };
        });
    }

    /**
     * Calculate result status based on multiple factors
     */
    private calculateResultStatus(
        row: {
            resultId: number | null;
            resultStatus: string | null;
            resultResult: string | null;
            raStatus: string | null;
            raResult: string | null;
            tenderCategory: string | null;
            reverseAuctionApplicable: string | null;
        },
        isRaApplicable: boolean
    ): string {
        // For RA tenders, use RA result
        if (isRaApplicable && row.raResult) {
            switch (row.raResult) {
                case 'Won':
                    return RESULT_STATUS.WON;
                case 'Lost':
                    return RESULT_STATUS.LOST;
                case 'H1 Elimination':
                    return RESULT_STATUS.LOST_H1;
            }
        }

        // For RA tenders, check RA status for disqualification
        if (isRaApplicable && row.raStatus === 'Disqualified') {
            return RESULT_STATUS.DISQUALIFIED;
        }

        // Check tender_results for non-RA tenders
        if (!isRaApplicable && row.resultResult) {
            if (row.resultResult === 'Won') return RESULT_STATUS.WON;
            if (row.resultResult === 'Lost') return RESULT_STATUS.LOST;
        }

        // Check tender_results status
        if (row.resultStatus) {
            if (row.resultStatus === 'Won') return RESULT_STATUS.WON;
            if (row.resultStatus === 'Lost') return RESULT_STATUS.LOST;
            if (row.resultStatus === 'Disqualified') return RESULT_STATUS.DISQUALIFIED;
            if (row.resultStatus === 'Lost - H1 Elimination') return RESULT_STATUS.LOST_H1;
        }

        // Check tender category as fallback
        if (row.tenderCategory) {
            if (row.tenderCategory === 'won') return RESULT_STATUS.WON;
            if (row.tenderCategory === 'lost') return RESULT_STATUS.LOST;
        }

        // Default: Result Awaited
        return RESULT_STATUS.RESULT_AWAITED;
    }

    /**
     * Legacy findAll method for backward compatibility
     */
    async findAll(): Promise<ResultDashboardRow[]> {
        return this.findAllFromTenders();
    }

    private async getEmdDetailsForTenders(
        tenderIds: number[]
    ): Promise<Map<number, { type: string; status: string }>> {
        if (tenderIds.length === 0) {
            return new Map();
        }

        const emdMap = new Map<number, { type: string; status: string }>();

        // Get payment requests with EMD purpose and their active instruments
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

    /**
     * Format EMD details for display
     */
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

        // Map instrument status to display status
        const displayStatus = this.mapInstrumentStatusToDisplay(instrumentDetails.status);

        return {
            amount: emdAmount || '0',
            instrumentType: instrumentDetails.type,
            instrumentStatus: instrumentDetails.status,
            displayText: `${instrumentDetails.type} (${displayStatus})`,
        };
    }

    /**
     * Map detailed instrument status to simplified display status
     */
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

    /**
     * Get tender result by Tender ID
     */
    async findByTenderId(tenderId: number) {
        const [result] = await this.db
            .select()
            .from(tenderResults)
            .where(eq(tenderResults.tenderId, tenderId))
            .limit(1);

        return result || null;
    }

    /**
     * Get or create result entry for a tender
     */
    async getOrCreateForTender(tenderId: number): Promise<{ id: number; isNew: boolean }> {
        // Check if already exists
        const existing = await this.findByTenderId(tenderId);
        if (existing) {
            return { id: existing.id, isNew: false };
        }

        // Create result entry
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
        // Check if already exists
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

    /**
     * Upload Result (for non-RA tenders)
     * Creates result entry if it doesn't exist
     */
    async uploadResult(id: number | null, tenderId: number, dto: UploadResultDto) {
        let resultId = id;

        // If no result ID provided, get or create one
        if (!resultId) {
            const result = await this.getOrCreateForTender(tenderId);
            resultId = result.id;
        }

        const existing = await this.findById(resultId);

        // Check if this is an RA tender - if so, results should come from RA dashboard
        if (existing.raApplicable && existing.reverseAuctionId) {
            throw new BadRequestException(
                'This tender has RA applicable. Please upload result through RA Dashboard.'
            );
        }

        let updateData: any = {
            technicallyQualified: dto.technicallyQualified,
            updatedAt: new Date(),
        };

        if (dto.technicallyQualified === 'No') {
            // Disqualified
            updateData.status = RESULT_STATUS.DISQUALIFIED;
            updateData.disqualificationReason = dto.disqualificationReason;
        } else {
            // Qualified - set result
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
        }

        const [result] = await this.db
            .update(tenderResults)
            .set(updateData)
            .where(eq(tenderResults.id, resultId))
            .returning();

        return result;
    }

    /**
     * Get linked RA details for a tender result
     */
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
