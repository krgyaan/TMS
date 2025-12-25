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
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';

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
    tenderStatusId: number | null;
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

export type ResultDashboardCounts = {
    pending: number;
    won: number;
    lost: number;
    disqualified: number;
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

@Injectable()
export class TenderResultService {
    private readonly logger = new Logger(TenderResultService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) { }

    async findAll(filters?: ResultDashboardFilters): Promise<PaginatedResult<ResultDashboardRow>> {
        console.log('=== findAll START ===');
        console.log('filters:', JSON.stringify(filters, null, 2));

        // Convert page and limit to numbers, with validation
        const pageRaw = filters?.page;
        const limitRaw = filters?.limit;
        const page = pageRaw ? (isNaN(Number(pageRaw)) || Number(pageRaw) < 1 ? 1 : Math.floor(Number(pageRaw))) : 1;
        const limit = limitRaw ? (isNaN(Number(limitRaw)) || Number(limitRaw) < 1 ? 50 : Math.floor(Number(limitRaw))) : 50;
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
                    // Pending: result status is null OR 'Under Evaluation' AND tender status is one of: Bid Submitted, TQ Qualified, No TQ, Qualified
                    const pendingStatusNames = ['Bid Submitted', 'TQ Qualified', 'No TQ', 'Qualified'];
                    console.log('Pending filter - checking status names:', pendingStatusNames);
                    console.log('Pending filter - checking for NULL OR Under Evaluation tenderResults.status');
                    typeFilter = and(
                        or(
                            isNull(tenderResults.status),
                            inArray(statuses.name, pendingStatusNames),
                            eq(tenderResults.status, RESULT_STATUS.UNDER_EVALUATION)
                        ),
                    );
                    break;
                case 'won':
                    typeFilter = eq(tenderResults.status, RESULT_STATUS.WON);
                    break;
                case 'lost':
                    typeFilter = inArray(tenderResults.status, [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1]);
                    break;
                case 'disqualified':
                    typeFilter = eq(tenderResults.status, RESULT_STATUS.DISQUALIFIED);
                    break;
            }
        }
        console.log('typeFilter', typeFilter);

        // Build where conditions
        const whereConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb']),
            eq(bidSubmissions.status, bidSubmissionStatusEnum.enumValues[1])
        ];
        console.log('whereConditions', whereConditions);

        if (typeFilter) {
            whereConditions.push(typeFilter);
            console.log('Type filter added to conditions');
        } else {
            console.log('No type filter applied');
        }

        try {
            // Check 1: Base conditions only (without type filter)
            const baseConditionsCount = await this.db
                .select({ count: sql<number>`count(*)` })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .where(and(...whereConditions.slice(0, 4))); // Base conditions only

            const baseCount = Number(baseConditionsCount[0]?.count || 0);

            // Check 3: If type filter exists, check count with type filter
            if (typeFilter) {
                const withTypeFilterCount = await this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(tenderInfos)
                    .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                    .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
                    .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
                    .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                    .where(and(...whereConditions));
            }
        } catch (diagError) {
            console.error('Diagnostic query error:', diagError);
        }

        // Fetch the rows from the database with DISTINCT to avoid duplicates
        try {
            const rows = await this.db
                .select({
                    tenderId: tenderInfos.id,
                    tenderNo: tenderInfos.tenderNo,
                    tenderName: tenderInfos.tenderName,
                    tenderValue: tenderInfos.gstValues,
                    emdAmount: tenderInfos.emd,
                    teamExecutiveName: users.name,
                    itemName: items.name,
                    statusId: tenderInfos.status,
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
                console.log('=== No rows found, returning empty result ===');
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
                tenderStatusId: row.statusId,
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
        } catch (error) {
            console.error('Error details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            console.error('Query parameters:', { filters, page, limit, offset });
            throw error;
        }
    }

    async getCounts(): Promise<ResultDashboardCounts> {
        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb']),
            eq(bidSubmissions.status, bidSubmissionStatusEnum.enumValues[1]),
        ];

        // Count pending (result status is null OR 'Under Evaluation' AND tender status is one of: Bid Submitted, TQ Qualified, No TQ, Qualified)
        const pendingStatusNames = ['Bid Submitted', 'TQ Qualified', 'No TQ', 'Qualified'];

        const pendingCount = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    ...baseConditions,
                    or(
                        isNull(tenderResults.status),
                        eq(tenderResults.status, RESULT_STATUS.UNDER_EVALUATION),
                        inArray(statuses.name, pendingStatusNames)
                    ),
                )
            );

        // Count won
        const wonCount = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    ...baseConditions,
                    eq(tenderResults.status, RESULT_STATUS.WON)
                )
            );

        // Count lost (Lost or Lost - H1 Elimination)
        const lostCount = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    ...baseConditions,
                    inArray(tenderResults.status, [RESULT_STATUS.LOST, RESULT_STATUS.LOST_H1])
                )
            );

        // Count disqualified
        const disqualifiedCount = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .innerJoin(users, eq(users.id, tenderInfos.teamMember))
            .innerJoin(bidSubmissions, eq(bidSubmissions.tenderId, tenderInfos.id))
            .leftJoin(tenderResults, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    ...baseConditions,
                    eq(tenderResults.status, RESULT_STATUS.DISQUALIFIED)
                )
            );

        const pending = Number(pendingCount[0]?.count || 0);
        const won = Number(wonCount[0]?.count || 0);
        const lost = Number(lostCount[0]?.count || 0);
        const disqualified = Number(disqualifiedCount[0]?.count || 0);

        return {
            pending,
            won,
            lost,
            disqualified,
            total: pending + won + lost + disqualified,
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
            // Disqualified: Update tender status to 22
            updateData.status = RESULT_STATUS.DISQUALIFIED;
            updateData.disqualificationReason = dto.disqualificationReason;
            newStatus = 22; // Status ID for "Disqualified (reason)"
            statusComment = 'Disqualified';
        } else {
            // Qualified: Save qualified parties data
            updateData.qualifiedPartiesCount = dto.qualifiedPartiesCount;
            updateData.qualifiedPartiesNames = dto.qualifiedPartiesNames;
            updateData.qualifiedPartiesScreenshot = dto.qualifiedPartiesScreenshot;

            // Only update tender status if result details are provided
            if (dto.result) {
                updateData.status = dto.result === 'Won' ? RESULT_STATUS.WON : RESULT_STATUS.LOST;
                updateData.result = dto.result;
                updateData.l1Price = dto.l1Price;
                updateData.l2Price = dto.l2Price;
                updateData.ourPrice = dto.ourPrice;
                updateData.finalResultScreenshot = dto.finalResultScreenshot;
                updateData.resultUploadedAt = new Date();

                // Update tender status based on result
                newStatus = dto.result === 'Won' ? 25 : 24; // 25 for Won, 24 for Lost
                statusComment = dto.result === 'Won' ? 'Won (PO awaited)' : 'Lost';
            } else {
                // No result details: Only update result status, not tender status
                updateData.status = RESULT_STATUS.UNDER_EVALUATION;
                // newStatus remains null, so tender status won't be updated
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
                    statusComment,
                    tx
                );
            }

            return updated;
        });

        // Send email notification if result details are provided
        if (dto.result && dto.technicallyQualified === 'Yes') {
            await this.sendTenderResultEmail(tenderId, result, changedBy, dto);
        }

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
     * Send tender result email
     */
    private async sendTenderResultEmail(
        tenderId: number,
        resultRecord: {
            qualifiedPartiesScreenshot: string | null;
            finalResultScreenshot: string | null;
        },
        uploadedBy: number,
        dto: UploadResultDto
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender || !tender.teamMember) return;

        // Get costing sheet data
        const costingSheet = await this.db
            .select({
                submittedReceiptPrice: tenderCostingSheets.submittedReceiptPrice,
                submittedBudgetPrice: tenderCostingSheets.submittedBudgetPrice,
                submittedGrossMargin: tenderCostingSheets.submittedGrossMargin,
            })
            .from(tenderCostingSheets)
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1);

        // Format currency values
        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const emailData = {
            tender_no: tender.tenderNo,
            tender_name: tender.tenderName,
            result: dto.result || 'Not specified',
            l1_price_formatted: formatCurrency(dto.l1Price),
            l2_price_formatted: formatCurrency(dto.l2Price),
            our_price_formatted: formatCurrency(dto.ourPrice),
            costing_receipt_formatted: formatCurrency(costingSheet[0]?.submittedReceiptPrice || null),
            costing_budget_formatted: formatCurrency(costingSheet[0]?.submittedBudgetPrice || null),
            costing_gross_margin: costingSheet[0]?.submittedGrossMargin ? `${costingSheet[0].submittedGrossMargin}%` : '0%',
            qualified_parties_screenshot: !!resultRecord.qualifiedPartiesScreenshot,
            final_result_screenshot: !!resultRecord.finalResultScreenshot,
            isWon: dto.result === 'Won',
        };

        await this.sendEmail(
            'tender.result',
            tenderId,
            uploadedBy,
            `Tender Result: ${tender.tenderNo}`,
            'tender-result',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [{ type: 'user', userId: tender.teamMember }],
            }
        );
    }
}
