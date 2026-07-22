import { paymentInstruments, paymentRequests } from '@/db/schemas';
import { AppLogger } from '@/logger/app-logger.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { UploadChangeStatusResultDto, UploadResultDto } from '@/modules/tendering/tender-result/dto/tender-result.dto';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { EmdDetails, PaginatedResult, ResultDashboardCounts, ResultDashboardFilters, ResultDashboardRow, ResultDashboardType } from '@/modules/tendering/types/shared.types';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { users } from '@db/schemas/auth/users.schema';
import { items } from '@db/schemas/master/items.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { woBasicDetails } from '@db/schemas/operations';
import { bidSubmissions } from '@db/schemas/tendering/bid-submissions.schema';
import { reverseAuctions } from '@db/schemas/tendering/reverse-auction.schema';
import { tenderCostingDetails } from '@db/schemas/tendering/tender-costing-details.schema';
import { tenderCostingSheets } from '@db/schemas/tendering/tender-costing-sheets.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { tenderResultDetails } from '@db/schemas/tendering/tender-result-details.schema';
import { tenderResults } from '@db/schemas/tendering/tender-result.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';

const RESULT_STATUS = {
    RESULT_AWAITED: 'Result Awaited',
    UNDER_EVALUATION: 'Under Evaluation',
    WON: 'Won',
    LOST: 'Lost',
    CANCELLED: 'Cancelled',
    LOST_H1: 'Lost - H1 Elimination',
    DISQUALIFIED: 'Disqualified',
} as const;

@Injectable()
export class TenderResultService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
        private readonly configService: ConfigService,
    ) {
        this.logger = this.appLogger.withContext(TenderResultService.name);
    }


    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user?.roleId) {
            if (user.dataScope === 'all') {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
            } else if (user.canSwitchTeams && teamId !== undefined && teamId !== null) {
                // Role can switch teams and selected a specific team
                roleFilterConditions.push(eq(tenderInfos.team, teamId));
            } else if (user.dataScope === 'team') {
                // Team-scoped roles: Filter by primary team
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                // Self-scoped roles: Show only own records
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
            result: sql<string>`(SELECT ${tenderResultDetails.result} FROM ${tenderResultDetails} WHERE ${tenderResultDetails.tenderResultId} = ${tenderResults.id} AND ${tenderResultDetails.result} IS NOT NULL LIMIT 1)`.as('result'),
            createdAt: tenderResults.createdAt,
        })
        .from(tenderResults)
        .orderBy(tenderResults.tenderId, desc(tenderResults.createdAt))
        .as('latestTenderResult');

    const latestCostingSheetSq = this.db
        .select({
            tenderId: tenderCostingSheets.tenderId,
            finalPrice: sql<string>`COALESCE(SUM(${tenderCostingDetails.finalPrice}), '0')`.as('finalPrice'),
        })
        .from(tenderCostingSheets)
        .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
        .where(eq(tenderCostingDetails.status, 'Approved'))
        .groupBy(tenderCostingSheets.tenderId)
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
        // conditions.push(TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
    } else if (activeTab === 'won') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Won', 'won'])
        , TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']));
    } else if (activeTab === 'lost') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['lost', 'Lost', 'Lost - H1 Elimination'])
        );
    } else if (activeTab === 'disqualified') {
        conditions.push(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Disqualified', 'Cancelled', 'disqualified'])
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
            woBasicDetailId: woBasicDetails.id,
        })
        .from(tenderInfos)
        .leftJoin(users, eq(users.id, tenderInfos.teamMember))
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
        .leftJoin(woBasicDetails, eq(woBasicDetails.tenderId, tenderInfos.id))
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
        woBasicDetailId: row.woBasicDetailId ?? null,
    }));

    // Count query with same subqueries
    const countQuery = this.db
        .select({ count: sql<number>`count(*)` })
        .from(tenderInfos)
        .leftJoin(users, eq(users.id, tenderInfos.teamMember))
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
                result: sql<string>`(SELECT ${tenderResultDetails.result} FROM ${tenderResultDetails} WHERE ${tenderResultDetails.tenderResultId} = ${tenderResults.id} AND ${tenderResultDetails.result} IS NOT NULL LIMIT 1)`.as('result'),
                createdAt: tenderResults.createdAt,
            })
            .from(tenderResults)
            .orderBy(tenderResults.tenderId, desc(tenderResults.createdAt))
            .as('latestTenderResult');

        const latestCostingSheetSq = this.db
            .select({
                tenderId: tenderCostingSheets.tenderId,
                finalPrice: sql<string>`COALESCE(SUM(${tenderCostingDetails.finalPrice}), '0')`.as('finalPrice'),
            })
            .from(tenderCostingSheets)
            .leftJoin(tenderCostingDetails, eq(tenderCostingDetails.tenderCostingSheetId, tenderCostingSheets.id))
            .where(eq(tenderCostingDetails.status, 'Approved'))
            .groupBy(tenderCostingSheets.tenderId)
            .as('latestCostingSheet');

        const baseWhere = and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            isNotNull(latestBidSubmissionSq.tenderId),
            ...roleFilterConditions,
        );

        const amountSql = sql<number>`coalesce(${latestCostingSheetSq.finalPrice}, ${tenderInfos.gstValues})`;

        const pendingFilter = and(
            or(
                isNull(latestTenderResultSq.id),
                inArray(latestTenderResultSq.status, ['Under Evaluation', 'Result Awaited']),
            ),
        );

        const wonFilter = and(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Won', 'won']),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
        );

        const lostFilter = and(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['lost', 'Lost', 'Lost - H1 Elimination']),
        );

        const disqualifiedFilter = and(
            isNotNull(latestTenderResultSq.id),
            inArray(latestTenderResultSq.status, ['Disqualified', 'Cancelled', 'disqualified']),
        );

        const [counts] = await this.db
            .select({
                pending: sql<number>`count(*) filter (where ${pendingFilter})`,
                won: sql<number>`count(*) filter (where ${wonFilter})`,
                lost: sql<number>`count(*) filter (where ${lostFilter})`,
                disqualified: sql<number>`count(*) filter (where ${disqualifiedFilter})`,
                pendingAmount: sql<number>`coalesce(sum(${amountSql}) filter (where ${pendingFilter}), 0)`,
                wonAmount: sql<number>`coalesce(sum(${amountSql}) filter (where ${wonFilter}), 0)`,
                lostAmount: sql<number>`coalesce(sum(${amountSql}) filter (where ${lostFilter}), 0)`,
                disqualifiedAmount: sql<number>`coalesce(sum(${amountSql}) filter (where ${disqualifiedFilter}), 0)`,
            })
            .from(tenderInfos)
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(latestBidSubmissionSq, eq(latestBidSubmissionSq.tenderId, tenderInfos.id))
            .leftJoin(latestTenderResultSq, eq(latestTenderResultSq.tenderId, tenderInfos.id))
            .leftJoin(latestCostingSheetSq, eq(latestCostingSheetSq.tenderId, tenderInfos.id))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(baseWhere);

        const pending = Number(counts?.pending ?? 0);
        const won = Number(counts?.won ?? 0);
        const lost = Number(counts?.lost ?? 0);
        const disqualified = Number(counts?.disqualified ?? 0);

        return {
            pending,
            won,
            lost,
            disqualified,
            total: pending + won + lost + disqualified,
            totalAmounts: {
                pending: Number(counts?.pendingAmount ?? 0),
                won: Number(counts?.wonAmount ?? 0),
                lost: Number(counts?.lostAmount ?? 0),
                disqualified: Number(counts?.disqualifiedAmount ?? 0),
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
        const latestBidSubmissionSq = this.db
            .selectDistinctOn([bidSubmissions.tenderId], {
                tenderId: bidSubmissions.tenderId,
                submissionDatetime: bidSubmissions.submissionDatetime,
            })
            .from(bidSubmissions)
            .where(eq(bidSubmissions.status, 'Bid Submitted'))
            .orderBy(bidSubmissions.tenderId, desc(bidSubmissions.submissionDatetime))
            .as('latestBidSubmission');

        const [result] = await this.db
            .select({
                result: tenderResults,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamExecutiveName: users.name,
                tenderValue: tenderInfos.gstValues,
                emdAmount: tenderInfos.emd,
                costingFinalPrice: sql<string>`(SELECT COALESCE(SUM(${tenderCostingDetails.finalPrice}), '0')
                    FROM ${tenderCostingDetails}
                    INNER JOIN ${tenderCostingSheets} ON ${tenderCostingSheets.id} = ${tenderCostingDetails.tenderCostingSheetId}
                    WHERE ${tenderCostingSheets.tenderId} = ${tenderInfos.id}
                    AND ${tenderCostingDetails.status} = 'Approved')`,
                itemName: items.name,
                tenderStatus: statuses.name,
                reverseAuctionApplicable: tenderInformation.reverseAuctionApplicable,
                bidSubmissionDate: latestBidSubmissionSq.submissionDatetime,
                woBasicDetailId: woBasicDetails.id,
            })
            .from(tenderResults)
            .innerJoin(tenderInfos, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(woBasicDetails, eq(woBasicDetails.tenderId, tenderInfos.id))
            .leftJoin(latestBidSubmissionSq, eq(latestBidSubmissionSq.tenderId, tenderInfos.id))
            .where(eq(tenderResults.id, id))
            .limit(1);

        if (!result) {
            throw new NotFoundException('Tender result not found');
        }

        const emdDetailsMap = await this.getEmdDetailsForTenders([result.result.tenderId]);
        const emdDetails = this.formatEmdDetails(result.emdAmount, emdDetailsMap.get(result.result.tenderId));

        const detailRows = await this.db
            .select()
            .from(tenderResultDetails)
            .where(eq(tenderResultDetails.tenderResultId, result.result.id))
            .orderBy(tenderResultDetails.id);

        return {
            ...result.result,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            teamExecutiveName: result.teamExecutiveName,
            tenderValue: result.tenderValue,
            finalPrice: result.costingFinalPrice || result.tenderValue,
            itemName: result.itemName,
            tenderStatus: result.tenderStatus,
            resultStatus: result.result.status || '',
            raApplicable: result.reverseAuctionApplicable === 'Yes',
            bidSubmissionDate: result.bidSubmissionDate,
            woBasicDetailId: result.woBasicDetailId,
            resultReason: detailRows[0]?.resultReason ?? null,
            details: detailRows.map(d => ({
                ...d,
                qualifiedPartiesScreenshot: this.normalizeScreenshotArray(d.qualifiedPartiesScreenshot),
                finalResultScreenshot: this.normalizeScreenshotArray(d.finalResultScreenshot),
            })),
            emdDetails,
        };
    }

    async findByTenderId(tenderId: number) {
        const latestBidSubmissionSq = this.db
            .selectDistinctOn([bidSubmissions.tenderId], {
                tenderId: bidSubmissions.tenderId,
                submissionDatetime: bidSubmissions.submissionDatetime,
            })
            .from(bidSubmissions)
            .where(eq(bidSubmissions.status, 'Bid Submitted'))
            .orderBy(bidSubmissions.tenderId, desc(bidSubmissions.submissionDatetime))
            .as('latestBidSubmission');

        const [result] = await this.db
            .select({
                result: tenderResults,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                teamExecutiveName: users.name,
                tenderValue: tenderInfos.gstValues,
                emdAmount: tenderInfos.emd,
                costingFinalPrice: sql<string>`(SELECT COALESCE(SUM(${tenderCostingDetails.finalPrice}), '0')
                    FROM ${tenderCostingDetails}
                    INNER JOIN ${tenderCostingSheets} ON ${tenderCostingSheets.id} = ${tenderCostingDetails.tenderCostingSheetId}
                    WHERE ${tenderCostingSheets.tenderId} = ${tenderInfos.id}
                    AND ${tenderCostingDetails.status} = 'Approved')`,
                itemName: items.name,
                tenderStatus: statuses.name,
                reverseAuctionApplicable: tenderInformation.reverseAuctionApplicable,
                bidSubmissionDate: latestBidSubmissionSq.submissionDatetime,
                woBasicDetailId: woBasicDetails.id,
            })
            .from(tenderResults)
            .innerJoin(tenderInfos, eq(tenderResults.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(items, eq(items.id, tenderInfos.item))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(woBasicDetails, eq(woBasicDetails.tenderId, tenderInfos.id))
            .leftJoin(latestBidSubmissionSq, eq(latestBidSubmissionSq.tenderId, tenderInfos.id))
            .where(eq(tenderResults.tenderId, tenderId))
            .limit(1);

        if (!result) {
            return null;
        }

        const emdDetailsMap = await this.getEmdDetailsForTenders([tenderId]);
        const emdDetails = this.formatEmdDetails(result.emdAmount, emdDetailsMap.get(tenderId));

        const detailRows = await this.db
            .select()
            .from(tenderResultDetails)
            .where(eq(tenderResultDetails.tenderResultId, result.result.id))
            .orderBy(tenderResultDetails.id);

        return {
            ...result.result,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            teamExecutiveName: result.teamExecutiveName,
            tenderValue: result.tenderValue,
            finalPrice: result.costingFinalPrice || result.tenderValue,
            itemName: result.itemName,
            tenderStatus: result.tenderStatus,
            resultStatus: result.result.status || '',
            raApplicable: result.reverseAuctionApplicable === 'Yes',
            bidSubmissionDate: result.bidSubmissionDate,
            woBasicDetailId: result.woBasicDetailId,
            resultReason: detailRows[0]?.resultReason ?? null,
            details: detailRows.map(d => ({
                ...d,
                qualifiedPartiesScreenshot: this.normalizeScreenshotArray(d.qualifiedPartiesScreenshot),
                finalResultScreenshot: this.normalizeScreenshotArray(d.finalResultScreenshot),
            })),
            emdDetails,
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

    private toArray(v: any): string[] | null {
        if (Array.isArray(v)) return v.length > 0 ? v : null;
        if (v != null && v !== '') return [String(v)];
        return null;
    }

    private normalizeScreenshotArray(v: unknown): string[] {
        if (Array.isArray(v)) return v;
        if (v && typeof v === 'string') return [v];
        return [];
    }

    private normalizeDetails(dto: UploadResultDto): any[] {
        if (dto.details && Array.isArray(dto.details) && dto.details.length > 0) {
            return dto.details.map(d => ({
                result: d.result ?? null,
                l1Price: d.l1Price?.toString() ?? null,
                l2Price: d.l2Price?.toString() ?? null,
                ourPrice: d.ourPrice?.toString() ?? null,
                qualifiedPartiesScreenshot: this.toArray(d.qualifiedPartiesScreenshot),
                finalResultScreenshot: this.toArray(d.finalResultScreenshot),
                resultReason: d.resultReason ?? null,
            }));
        }
        if (dto.result) {
            return [{
                result: dto.result,
                l1Price: dto.l1Price?.toString() ?? null,
                l2Price: dto.l2Price?.toString() ?? null,
                ourPrice: dto.ourPrice?.toString() ?? null,
                qualifiedPartiesScreenshot: null,
                finalResultScreenshot: this.toArray(dto.finalResultScreenshot),
                resultReason: dto.resultReason ?? null,
            }];
        }
        return [];
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

        const details = this.normalizeDetails(dto);
        const hasResultDetails = details.some(d => !!d.result);
        const isCompleteResult = dto.technicallyQualified === 'No' || hasResultDetails;
        if (isCompleteResult) {
            if (existing.raStatus === 'pending' || existing.tqStatus === 'pending') {
                throw new BadRequestException(
                    'Cannot upload complete result while RA Status or TQ Status is pending.'
                );
            }
        }

        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        // Determine overall result from details
        const overallResult = details.find(d => d.result === 'Won')?.result
            || details.find(d => d.result === 'Cancelled')?.result
            || details.find(d => d.result === 'Lost')?.result
            || null;

        let updateData: any = {
            technicallyQualified: dto.technicallyQualified,
            updatedAt: new Date(),
        };

        let newStatus: number | null = null;
        let statusComment: string = '';

        if (dto.technicallyQualified === 'No') {
            updateData.status = RESULT_STATUS.DISQUALIFIED;
            updateData.disqualificationReason = dto.disqualificationReason;
            newStatus = 22;
            statusComment = 'Disqualified';
        } else {
            updateData.qualifiedPartiesCount = dto.qualifiedPartiesCount;
            updateData.qualifiedPartiesNames = dto.qualifiedPartiesNames;
            updateData.tenderCancelledScreenshot = dto.tenderCancelledScreenshot;

            if (overallResult === 'Won' || overallResult === 'Lost') {
                updateData.status = overallResult === 'Won' ? RESULT_STATUS.WON : RESULT_STATUS.LOST;
                newStatus = overallResult === 'Won' ? 25 : 24;
                statusComment = overallResult === 'Won' ? 'Won (PO awaited)' : 'Lost';
            } else if (overallResult === 'Cancelled') {
                updateData.status = RESULT_STATUS.CANCELLED;
                newStatus = 18;
                statusComment = "Tender Cancelled";
            } else {
                updateData.status = RESULT_STATUS.UNDER_EVALUATION;
            }
        }

        const result = await this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(tenderResults)
                .set(updateData)
                .where(eq(tenderResults.id, resultId))
                .returning();

            // Delete existing details and re-insert
            if (details.length > 0) {
                await tx
                    .delete(tenderResultDetails)
                    .where(eq(tenderResultDetails.tenderResultId, resultId));

                for (const detail of details) {
                    await tx
                        .insert(tenderResultDetails)
                        .values({
                            tenderResultId: resultId,
                            result: detail.result,
                            l1Price: detail.l1Price,
                            l2Price: detail.l2Price,
                            ourPrice: detail.ourPrice,
                            qualifiedPartiesScreenshot: detail.qualifiedPartiesScreenshot,
                            finalResultScreenshot: detail.finalResultScreenshot,
                            resultUploadedAt: detail.result ? new Date() : null,
                            resultReason: detail.resultReason,
                        });
                }
            }

            if (newStatus !== null) {
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

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

        // if (hasResultDetails && dto.technicallyQualified === 'Yes') {
        //     await this.sendTenderResultEmail(tenderId, changedBy, dto, details);
        // }

        return result;
    }

    async changeTenderResult(tenderId : number, user: any, dto: UploadChangeStatusResultDto){
        //Formulating the logic for changing status
        //-> entry inside result table
        //-> entry inside the tender table
        //-> entry inside tenderStatus

        let validStatuses = [21, 18, 45, 46];
        
        try{
        //getting the status info
        let [status] = await this.db.select().from(statuses).where(eq(statuses.id, dto.statusId));

        if(!status){
            throw new NotFoundException("Requested Status not Found!");
        }

        if(!validStatuses.includes(status.id)){
            throw new BadRequestException("Invalid status request made");
        }

        //involves the logic for changing the tender status
        const [tender] = await this.db.select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId));

        if(!tender){
            throw new NotFoundException(`Tender not found with id : ${tenderId}`);
        }

        const prevStatus = tender.status;

        //we will update the status
        await this.db
            .update(tenderInfos)
            .set({status : status.id})
            .where(eq(tenderInfos.id, tenderId));

        // Get or create tender result record
        const { id: resultId } = await this.getOrCreateForTender(tenderId);

        let newResultStatus: typeof RESULT_STATUS[keyof typeof RESULT_STATUS];
        let result: string;

        //we will use a switch statement to decide what all values will  be assigned 
        // on the basis of the status that has been selected
        switch (status.id) {
            case 21: {
                newResultStatus = RESULT_STATUS.DISQUALIFIED;
                result = "EMD Paid Late";
                break;
            }
            case 18: {
                newResultStatus = RESULT_STATUS.CANCELLED;
                result = "Tender Cancelled After Bidding";
                break;
            }
            case 45: {
                newResultStatus = RESULT_STATUS.LOST;
                result = "PO not awarded (after L1, MSME Match)";
                break;
            }
            case 46: {
                newResultStatus = RESULT_STATUS.LOST;
                result = "PO not awarded (Single Party)";
                break;
            }
            default: {
                throw new BadRequestException("Unhandled status id");
            }
        }

        // Update the tender result record with new status details
        await this.db
            .update(tenderResults)
            .set({
                status: newResultStatus,
                tenderCancelledScreenshot: dto.finalResultScreenshot,
                updatedAt: new Date(),
            })
            .where(eq(tenderResults.id, resultId));

        // Insert into tender_result_details
        await this.db
            .insert(tenderResultDetails)
            .values({
                tenderResultId: resultId,
                result: result,
                resultReason: dto.resultReason,
                finalResultScreenshot: dto.finalResultScreenshot ? [dto.finalResultScreenshot] : null,
                resultUploadedAt: new Date(),
            });

        //create tenderstatushistory log 
        await this.tenderStatusHistoryService.trackStatusChange(
            tenderId,
            status.id,
            user.sub,
            prevStatus,
            status.name,
        );

        //tender cancelled email sent
        // await this.sendTenderCancelledEmail(
        //     {
        //         tenderId: tenderId,
        //         tenderName: tender.tenderName,
        //         tenderLink: `${process.env.FRONTEND_URL}/tendering/results/${tenderId}`,
        //         tenderNo: tender.tenderNo,
        //         finalScreenshot: dto.finalResultScreenshot,
        //         team: tender.team
        //     },
        //     dto,
        //     user.sub
        // );

        // return the result
        return {
            message: "Tender Status Updated Successfully"
        }
        
        } catch (e){
            //throw error if error occurs
            throw new BadRequestException(`Semething went wrong : ${e}`);
        }
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
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[]; attachments?: { files: string[]; baseDir?: string } },
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
                attachments: recipients.attachments,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send tender result email
     */
    async sendTenderResultEmail(
        tenderId: number,
        uploadedBy: number,
        dto: UploadResultDto,
        details: any[],
    ) {
        const tender = await this.tenderInfosService.findById(tenderId);
        if (!tender?.teamMember) return;

        const costingDetail = await this.db
            .select({
                submittedReceiptPrice: sql<string>`SUM(${tenderCostingDetails.submittedReceiptPrice})`,
                submittedBudgetPrice: sql<string>`SUM(${tenderCostingDetails.submittedBudgetPrice})`,
                submittedGrossMargin: sql<string>`AVG(${tenderCostingDetails.submittedGrossMargin})`,
            })
            .from(tenderCostingDetails)
            .innerJoin(tenderCostingSheets, eq(tenderCostingSheets.id, tenderCostingDetails.tenderCostingSheetId))
            .where(eq(tenderCostingSheets.tenderId, tenderId))
            .limit(1);

        const formatCurrency = (value: string | null) => {
            if (!value) return '₹0';
            const num = Number(value);
            return Number.isNaN(num) ? value : `₹${num.toLocaleString('en-IN')}`;
        };

        const firstDetail = details[0] || {};
        const overallResult = details.find((d: any) => d.result === 'Won')?.result
            || details.find((d: any) => d.result === 'Cancelled')?.result
            || details.find((d: any) => d.result === 'Lost')?.result
            || 'Not specified';

        const fileBaseUrl = this.configService.get<string>('app.apiUrl') || '';
        const allScreenshotPaths = details.flatMap((d: any) => [
            ...(this.toArray(d.qualifiedPartiesScreenshot) ?? []),
            ...(this.toArray(d.finalResultScreenshot) ?? []),
        ]).filter(Boolean) as string[];

        const screenshotLinks = allScreenshotPaths.map(path => ({
            name: path.split('/').pop() || path,
            url: `${fileBaseUrl}/tender-files/serve/${path}`,
        }));

        const emailData = {
            tender_no: tender.tenderNo,
            tender_name: tender.tenderName,
            result: overallResult,
            l1_price_formatted: formatCurrency(firstDetail.l1Price ?? null),
            l2_price_formatted: formatCurrency(firstDetail.l2Price ?? null),
            our_price_formatted: formatCurrency(firstDetail.ourPrice ?? null),
            result_reason: firstDetail.resultReason || 'Not specified',
            costing_receipt_formatted: formatCurrency(costingDetail[0]?.submittedReceiptPrice || null),
            costing_budget_formatted: formatCurrency(costingDetail[0]?.submittedBudgetPrice || null),
            costing_gross_margin: costingDetail[0]?.submittedGrossMargin ? `${Number(costingDetail[0].submittedGrossMargin).toFixed(2)}%` : '0%',
            screenshots: screenshotLinks,
            detail_count: details.length,
            isWon: overallResult === 'Won',
        };

        await this.sendEmail(
            'tender.result',
            tenderId,
            uploadedBy,
            `Tender Result - ${emailData.result} - ${tender.tenderName}`,
            'tender-result',
            emailData,
            {
                // to: [{ type: 'emails', emails: ['gyan@volksenergie.in'] }],
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }],
            }
        );
    }

    async sendTenderCancelledEmail(
        tender: {tenderId: number, tenderName : string, tenderLink: string, tenderNo: string, finalScreenshot: string, team : number},
        dto: any, 
        uploadedBy: number){
        const fileBaseUrl = this.configService.get<string>('app.apiUrl') || '';
        const cancelledUrl = tender.finalScreenshot
            ? `${fileBaseUrl}/tender-files/serve/${tender.finalScreenshot}`
            : null;

        const emailData = {
            tender_name : tender.tenderName,
            tender_link : tender.tenderLink,
            tender_no : tender.tenderNo,
            final_screenshot_url : cancelledUrl,
            final_screenshot_name : tender.finalScreenshot?.split('/').pop() || '',
            reason: dto.resultReason
        };

        await this.sendEmail(
            'tender-result-cancelled',
            tender.tenderId,
            uploadedBy,
            `Tender Cancelled - ${tender.tenderName}`,
            'tender-result-cancelled',
            emailData,
            {
                to: [{ type: 'role', role: 'Team Leader', teamId: tender.team }],
                cc: [{ type: 'role', role: 'Admin', teamId: tender.team }],
            }
        );
    }
}
