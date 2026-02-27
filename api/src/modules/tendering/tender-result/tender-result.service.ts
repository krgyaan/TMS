import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, asc, desc, inArray, sql, isNull, or, isNotNull } from 'drizzle-orm';
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
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { PaginatedResult, ResultDashboardType, ResultDashboardFilters, ResultDashboardRow, ResultDashboardCounts, EmdDetails } from '@/modules/tendering/types/shared.types';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { paymentInstruments, paymentRequests } from '@/db/schemas';
import type { UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

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

    async getDashboardData(
    user?: ValidatedUser,
    teamId?: number,
    tab?: ResultDashboardType,
    filters?: ResultDashboardFilters
    ): Promise<PaginatedResult<ResultDashboardRow>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const activeTab = tab || 'result-awaited';

    // Create subqueries that return only one row per tender
    const latestBidSubmissionSq = this.db
        .selectDistinctOn([bidSubmissions.tenderId], {
            tenderId: bidSubmissions.tenderId,
            submissionDatetime: bidSubmissions.submissionDatetime,
            status: bidSubmissions.status,
        })
        .from(bidSubmissions)
        .where(eq(bidSubmissions.status, 'Bid Submitted'))
        .orderBy(bidSubmissions.tenderId, desc(bidSubmissions.submissionDatetime))
        .as('latestBidSubmission');

    const latestTenderResultSq = this.db
        .selectDistinctOn([tenderResults.tenderId], {
            tenderId: tenderResults.tenderId,
            id: tenderResults.id,
            status: tenderResults.status,
            result: tenderResults.result,
            createdAt: tenderResults.createdAt,
        })
        .from(tenderResults)
        .orderBy(tenderResults.tenderId, desc(tenderResults.createdAt))
        .as('latestTenderResult');

    const latestCostingSheetSq = this.db
        .selectDistinctOn([tenderCostingSheets.tenderId], {
            tenderId: tenderCostingSheets.tenderId,
            finalPrice: tenderCostingSheets.finalPrice,
        })
        .from(tenderCostingSheets)
        .orderBy(tenderCostingSheets.tenderId, desc(tenderCostingSheets.createdAt))
        .as('latestCostingSheet');

    // Build base conditions (removed bidSubmissions.status since it's in subquery now)
    const baseConditions = [
        TenderInfosService.getActiveCondition(),
        TenderInfosService.getApprovedCondition(),
        isNotNull(latestBidSubmissionSq.tenderId), // Ensures bid submission exists
    ];

    // Apply role-based filtering
    const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

    // Build tab-specific conditions
    const conditions = [...baseConditions, ...roleFilterConditions];

    if (activeTab === 'result-awaited') {
        conditions.push(
            or(
                isNull(latestTenderResultSq.id),
                inArray(latestTenderResultSq.status, ['Under Evaluation', 'Result Awaited'])
            )!
        );
        conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
    } else if (activeTab === 'won') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Won', 'won'])
        );
        conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
    } else if (activeTab === 'lost') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['lost', 'Lost', 'Lost - H1 Elimination'])
        );
    } else if (activeTab === 'disqualified') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Disqualified', 'cancelled', 'disqualified'])
        );
    } else {
        throw new BadRequestException(`Invalid tab: ${activeTab}`);
    }

    // Search filter
    if (filters?.search) {
        const searchStr = `%${filters.search}%`;
        const searchConditions: any[] = [
            sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
            sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
            sql`${latestBidSubmissionSq.submissionDatetime}::text ILIKE ${searchStr}`,
            sql`${users.name} ILIKE ${searchStr}`,
            sql`${statuses.name} ILIKE ${searchStr}`,
            sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
            sql`${latestCostingSheetSq.finalPrice}::text ILIKE ${searchStr}`,
            sql`${items.name} ILIKE ${searchStr}`,
            sql`${latestTenderResultSq.result} ILIKE ${searchStr}`,
        ];
        conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
    }

    const whereClause = and(...conditions);

    // Sorting
    const sortBy = filters?.sortBy;
    const sortOrder = filters?.sortOrder || 'desc';
    let orderByClause: any = desc(latestBidSubmissionSq.submissionDatetime);

    if (sortBy) {
        const sortFn = sortOrder === 'desc' ? desc : asc;
        switch (sortBy) {
            case 'tenderNo':
                orderByClause = sortFn(tenderInfos.tenderNo);
                break;
            case 'tenderName':
                orderByClause = sortFn(tenderInfos.tenderName);
                break;
            case 'teamExecutiveName':
                orderByClause = sortFn(users.name);
                break;
            case 'bidSubmissionDate':
                orderByClause = sortFn(latestBidSubmissionSq.submissionDatetime);
                break;
            case 'resultDate':
                orderByClause = sortFn(latestTenderResultSq.createdAt);
                break;
            case 'disqualificationDate':
                orderByClause = sortFn(latestTenderResultSq.createdAt);
                break;
            case 'finalPrice':
                orderByClause = sortFn(latestCostingSheetSq.finalPrice);
                break;
            case 'itemName':
                orderByClause = sortFn(items.name);
                break;
            case 'tenderStatus':
                orderByClause = sortFn(statuses.name);
                break;
            default:
                orderByClause = sortFn(latestBidSubmissionSq.submissionDatetime);
        }
    }

    // Main query with subqueries
    const query = this.db
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
            bidSubmissionDate: latestBidSubmissionSq.submissionDatetime,
            costingFinalPrice: latestCostingSheetSq.finalPrice,
            resultId: latestTenderResultSq.id,
            resultStatus: latestTenderResultSq.status,
        })
        .from(tenderInfos)
        .innerJoin(users, eq(users.id, tenderInfos.teamMember))
        .leftJoin(
            latestBidSubmissionSq,
            eq(latestBidSubmissionSq.tenderId, tenderInfos.id)
        )
        .leftJoin(
            latestTenderResultSq,
            eq(latestTenderResultSq.tenderId, tenderInfos.id)
        )
        .leftJoin(
            latestCostingSheetSq,
            eq(latestCostingSheetSq.tenderId, tenderInfos.id)
        )
        .leftJoin(items, eq(items.id, tenderInfos.item))
        .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
        .where(whereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

    const rows = await query;

    if (!rows || rows.length === 0) {
        return wrapPaginatedResponse([], 0, page, limit);
    }

    const tenderIds = rows.map((r) => r.tenderId);
    const emdDetailsMap = await this.getEmdDetailsForTenders(tenderIds);

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
        resultStatus: row.resultStatus || '',
        emdDetails: this.formatEmdDetails(row.emdAmount, emdDetailsMap.get(row.tenderId)),
        hasResultEntry: row.resultId !== null,
    }));

    // Count query with same subqueries
    const countQuery = this.db
        .select({ count: sql<number>`count(*)` })
        .from(tenderInfos)
        .innerJoin(users, eq(users.id, tenderInfos.teamMember))
        .leftJoin(
            latestBidSubmissionSq,
            eq(latestBidSubmissionSq.tenderId, tenderInfos.id)
        )
        .leftJoin(
            latestTenderResultSq,
            eq(latestTenderResultSq.tenderId, tenderInfos.id)
        )
        .leftJoin(
            latestCostingSheetSq,
            eq(latestCostingSheetSq.tenderId, tenderInfos.id)
        )
        .leftJoin(items, eq(items.id, tenderInfos.item))
        .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
        .where(whereClause);

    const [totalResult] = await countQuery;

    const total = Number(totalResult?.count || 0);
    return wrapPaginatedResponse(data, total, page, limit);
    }

    async getCounts(user?: ValidatedUser, teamId?: number): Promise<ResultDashboardCounts> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        // Subqueries copied from getDashboardData for consistency
        const latestBidSubmissionSq = this.db
            .selectDistinctOn([bidSubmissions.tenderId], {
                tenderId: bidSubmissions.tenderId,
                submissionDatetime: bidSubmissions.submissionDatetime,
                status: bidSubmissions.status,
            })
            .from(bidSubmissions)
            .where(eq(bidSubmissions.status, 'Bid Submitted'))
            .orderBy(bidSubmissions.tenderId, desc(bidSubmissions.submissionDatetime))
            .as('latestBidSubmission');

        const latestTenderResultSq = this.db
            .selectDistinctOn([tenderResults.tenderId], {
                tenderId: tenderResults.tenderId,
                id: tenderResults.id,
                status: tenderResults.status,
                result: tenderResults.result,
                createdAt: tenderResults.createdAt,
            })
            .from(tenderResults)
            .orderBy(tenderResults.tenderId, desc(tenderResults.createdAt))
            .as('latestTenderResult');

        const latestCostingSheetSq = this.db
            .selectDistinctOn([tenderCostingSheets.tenderId], {
                tenderId: tenderCostingSheets.tenderId,
                finalPrice: tenderCostingSheets.finalPrice,
            })
            .from(tenderCostingSheets)
            .orderBy(tenderCostingSheets.tenderId, desc(tenderCostingSheets.createdAt))
            .as('latestCostingSheet');

        const baseConditions = [
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(latestBidSubmissionSq.tenderId),
            ...roleFilterConditions,
        ];

        const amountSql = sql<number>`coalesce(${latestCostingSheetSq.finalPrice}, ${tenderInfos.gstValues})`;

        const getTabCounts = async (tab: ResultDashboardType) => {
            const conditions = [...baseConditions];

            if (tab === 'result-awaited') {
                conditions.push(
                    or(
                        isNull(latestTenderResultSq.id),
                        inArray(latestTenderResultSq.status, ['Under Evaluation', 'Result Awaited'])
                    )!
                );
                conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
            } else if (tab === 'won') {
                conditions.push(
                    isNotNull(latestTenderResultSq.id),
                    inArray(latestTenderResultSq.status, ['Won', 'won'])
                );
                conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
            } else if (tab === 'lost') {
                conditions.push(
                    isNotNull(latestTenderResultSq.id),
                    inArray(latestTenderResultSq.status, ['lost', 'Lost', 'Lost - H1 Elimination'])
                );
            } else if (tab === 'disqualified') {
                conditions.push(
                    isNotNull(latestTenderResultSq.id),
                    inArray(latestTenderResultSq.status, ['Disqualified', 'cancelled', 'disqualified'])
                );
            }

            const result = await this.db
                .select({
                    count: sql<number>`count(*)`,
                    amount: sql<number>`sum(${amountSql})`
                })
                .from(tenderInfos)
                .innerJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(latestBidSubmissionSq, eq(latestBidSubmissionSq.tenderId, tenderInfos.id))
                .leftJoin(latestTenderResultSq, eq(latestTenderResultSq.tenderId, tenderInfos.id))
                .leftJoin(latestCostingSheetSq, eq(latestCostingSheetSq.tenderId, tenderInfos.id))
                .leftJoin(items, eq(items.id, tenderInfos.item))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .where(and(...conditions));

            return {
                count: Number(result[0]?.count || 0),
                amount: Number(result[0]?.amount || 0)
            };
        };

        const [pending, won, lost, disqualified] = await Promise.all([
            getTabCounts('result-awaited'),
            getTabCounts('won'),
            getTabCounts('lost'),
            getTabCounts('disqualified'),
        ]);

        return {
            pending: pending.count,
            won: won.count,
            lost: lost.count,
            disqualified: disqualified.count,
            total: pending.count + won.count + lost.count + disqualified.count,
            totalAmounts: {
                pending: pending.amount,
                won: won.amount,
                lost: lost.amount,
                disqualified: disqualified.amount,
            }
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
            .where(eq(tenderResults.tenderId, tenderId))
            .limit(1);

        if (!result) {
            return null;
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
            l1_price_formatted: formatCurrency(dto.l1Price?.toString() ?? null),
            l2_price_formatted: formatCurrency(dto.l2Price?.toString() ?? null),
            our_price_formatted: formatCurrency(dto.ourPrice?.toString() ?? null),
            costing_receipt_formatted: formatCurrency(costingSheet[0]?.submittedReceiptPrice || null),
            costing_budget_formatted: formatCurrency(costingSheet[0]?.submittedBudgetPrice || null),
            costing_gross_margin: costingSheet[0]?.submittedGrossMargin ? `${costingSheet[0].submittedGrossMargin}%` : '0%',
            qualified_parties_screenshot: !!resultRecord.qualifiedPartiesScreenshot,
            final_result_screenshot: !!resultRecord.finalResultScreenshot,
            isWon: dto.result === 'Won',
        };

        const attachments = [
            {
                filename: 'qualified_parties_screenshot.pdf',
                path: resultRecord.qualifiedPartiesScreenshot,
            },
            {
                filename: 'final_result_screenshot.pdf',
                path: resultRecord.finalResultScreenshot,
            },
        ];

        await this.sendEmail(
            'tender.result',
            tenderId,
            uploadedBy,
            `Tender Result - ${emailData.result} - ${tender.tenderName}`,
            'tender-result',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }],
            }
        );
    }
}
