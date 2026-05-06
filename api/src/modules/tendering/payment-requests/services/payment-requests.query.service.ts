import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, and, or, inArray, gt, sql, desc, asc } from 'drizzle-orm';
import { 
    paymentRequests, 
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails
} from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderInformation } from '@/db/schemas/tendering/tender-info-sheet.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@/db/schemas/master/statuses.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { StatusCache } from '@/utils/status-cache';
import type { 
    DashboardTab, 
    DashboardCounts, 
    PendingTabResponse, 
    RequestTabResponse,
    PaymentRequestRow,
    PendingTenderRow, 
} from '../dto/payment-requests.dto';
import type { InstrumentResponse } from '../dto/payment-response.dto';
import {
    buildTenderRoleFilters,
    buildRequestRoleFilters,
    getDefaultSortByTab,
    getTabSqlCondition,
    deriveDisplayStatus,
} from './payment-requests.shared';

@Injectable()
export class PaymentRequestsQueryService {
    private readonly logger = new Logger(PaymentRequestsQueryService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
    ) {}

    // ============================================================================
    // Dashboard Methods
    // ============================================================================

    async getDashboardData(
        tab: DashboardTab = 'pending',
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        search?: string
    ): Promise<PendingTabResponse | RequestTabResponse> {
        const counts = await this.getDashboardCounts(user, teamId);

        if (tab === 'pending') return this.getPendingTenders(user, teamId, pagination, sort, counts, search);
        if (tab === 'tender-dnb') return this.getTenderDnbTenders(user, teamId, pagination, sort, counts, search);

        return this.getPaymentRequestsByTab(tab, user, teamId, pagination, sort, counts, search);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<DashboardCounts> {
        const pendingCount = await this.countPendingTenders(user, teamId);
        const requestCounts = await this.countRequestsByStatus(user, teamId);
        const tenderDnbCount = await this.countTenderDnb(user, teamId);

        return {
            pending: pendingCount,
            sent: requestCounts.sent,
            approved: requestCounts.approved,
            rejected: requestCounts.rejected,
            returned: requestCounts.returned,
            tenderDnb: tenderDnbCount,
            total: pendingCount + requestCounts.sent + requestCounts.approved + requestCounts.rejected + requestCounts.returned + tenderDnbCount,
        };
    }

    // ============================================================================
    // Count Methods
    // ============================================================================

    private async countPendingTenders(user?: ValidatedUser, teamId?: number): Promise<number> {
        const roleFilterConditions = buildTenderRoleFilters(user, teamId);

        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(
                TenderInfosService.getActiveCondition(),
                TenderInfosService.getApprovedCondition(),
                TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                or(
                    inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                    inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                    inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                ),
                or(
                    gt(tenderInfos.emd, sql`0`),
                    gt(tenderInfos.tenderFees, sql`0`),
                    gt(tenderInformation.processingFeeAmount, sql`0`)
                ),
                sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
                ...roleFilterConditions
            ));

        return Number(result?.count || 0);
    }

    private async countRequestsByStatus(
        user?: ValidatedUser, 
        teamId?: number
    ): Promise<{ sent: number; approved: number; rejected: number; returned: number; }> {
        const roleFilterConditions = buildRequestRoleFilters(user, teamId);

        const [result] = await this.db
            .select({
                sent: sql<number>`COALESCE(SUM(CASE WHEN ${getTabSqlCondition('sent')} THEN 1 ELSE 0 END), 0)`,
                approved: sql<number>`COALESCE(SUM(CASE WHEN ${getTabSqlCondition('approved')} THEN 1 ELSE 0 END), 0)`,
                rejected: sql<number>`COALESCE(SUM(CASE WHEN ${getTabSqlCondition('rejected')} THEN 1 ELSE 0 END), 0)`,
                returned: sql<number>`COALESCE(SUM(CASE WHEN ${getTabSqlCondition('returned')} THEN 1 ELSE 0 END), 0)`,
            })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(roleFilterConditions.length > 0 ? and(...roleFilterConditions) : undefined);

        return {
            sent: Number(result?.sent || 0),
            approved: Number(result?.approved || 0),
            rejected: Number(result?.rejected || 0),
            returned: Number(result?.returned || 0),
        };
    }

    private async countTenderDnb(user?: ValidatedUser, teamId?: number): Promise<number> {
        const roleFilterConditions = buildTenderRoleFilters(user, teamId);
        const dnbStatusIds = StatusCache.getIds('dnb');

        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(
                TenderInfosService.getActiveCondition(),
                TenderInfosService.getApprovedCondition(),
                TenderInfosService.getExcludeStatusCondition(['lost']),
                inArray(tenderInfos.status, dnbStatusIds),
                or(
                    inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                    inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                    inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                ),
                ...roleFilterConditions
            ));

        return Number(result?.count || 0);
    }

    // ============================================================================
    // Pending Tenders
    // ============================================================================

    async getPendingTenders(
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<PendingTabResponse> {
        const roleFilterConditions = buildTenderRoleFilters(user, teamId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        const searchTerm = search?.trim();
        const searchConditions: any[] = [];
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.emd}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderFees}::text ILIKE ${searchStr}`,
                sql`${tenderInformation.processingFeeAmount}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`
            );
        }

        const whereClause = and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
            or(
                inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
            ),
            or(
                gt(tenderInfos.emd, sql`0`),
                gt(tenderInfos.tenderFees, sql`0`),
                gt(tenderInformation.processingFeeAmount, sql`0`)
            ),
            sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
            ...roleFilterConditions,
            searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
        );

        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause);

        const totalCount = Number(countResult?.count || 0);

        let orderClause: any;
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderClause = direction(tenderInfos.tenderName);
                    break;
                case 'dueDate':
                    orderClause = direction(tenderInfos.dueDate);
                    break;
                case 'teamMember':
                    orderClause = direction(users.name);
                    break;
                case 'emdRequired':
                    orderClause = direction(tenderInfos.emd);
                    break;
                default:
                    orderClause = getDefaultSortByTab('pending');
            }
        } else {
            orderClause = getDefaultSortByTab('pending');
        }

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                status: tenderInfos.status,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                processingFee: tenderInformation.processingFeeAmount,
                processingFeeMode: tenderInformation.processingFeeMode,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const data: PendingTenderRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo?.toString() || '',
            tenderName: row.tenderName?.toString() || '',
            gstValues: row.gstValues,
            status: row.status || 0,
            statusName: row.statusName?.toString() || null,
            dueDate: row.dueDate,
            teamMemberId: row.teamMemberId,
            teamMember: row.teamMember?.toString() || null,
            emd: row.emd?.toString() || null,
            emdMode: row.emdMode?.toString() || null,
            tenderFee: row.tenderFee?.toString() || null,
            tenderFeeMode: row.tenderFeeMode?.toString() || null,
            processingFee: row.processingFee?.toString() || null,
            processingFeeMode: row.processingFeeMode?.toString() || null,
        }));

        const wrapped = wrapPaginatedResponse(data, totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    // ============================================================================
    // Payment Requests By Tab
    // ============================================================================

    async getPaymentRequestsByTab(
        tab: DashboardTab,
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<RequestTabResponse> {
        const roleFilterConditions = buildRequestRoleFilters(user, teamId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        const searchTerm = search?.trim();
        const searchConditions: any[] = [];
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${paymentRequests.tenderNo} ILIKE ${searchStr}`,
                sql`${paymentRequests.projectName} ILIKE ${searchStr}`,
                sql`${paymentRequests.purpose}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.type}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.amountRequired}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.instrumentType}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`
            );
        }

        let orderClause: any;
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderClause = direction(tenderInfos.tenderName);
                    break;
                case 'dueDate':
                    orderClause = direction(tenderInfos.dueDate);
                    break;
                case 'amountRequired':
                    orderClause = direction(paymentRequests.amountRequired);
                    break;
                case 'purpose':
                    orderClause = direction(paymentRequests.purpose);
                    break;
                case 'teamMember':
                    orderClause = direction(users.name);
                    break;
                default:
                    orderClause = getDefaultSortByTab(tab);
            }
        } else {
            orderClause = getDefaultSortByTab(tab);
        }

        const whereClause = and(
            getTabSqlCondition(tab),
            eq(paymentInstruments.isActive, true),
            ...roleFilterConditions,
            searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
        );

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(whereClause);

        const totalCount = Number(countResult?.count || 0);

        const rows = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                tenderNo: tenderInfos.tenderNo,
                projectNo: paymentRequests.tenderNo,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                purpose: paymentRequests.purpose,
                requestType: paymentRequests.type,
                amountRequired: paymentRequests.amountRequired,
                dueDate: tenderInfos.dueDate,
                dueDate2: paymentRequests.dueDate,
                bidValid: tenderInformation.bidValidityDays,
                teamMember: users.name,
                teamMemberId: users.id,
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                instrumentStatus: paymentInstruments.status,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const data: PaymentRequestRow[] = rows.map(row => {
            const effectiveDueDate = row.dueDate ?? row.dueDate2;
            return {
                id: row.id,
                tenderId: row.tenderId,
                tenderNo: row.tenderNo?.toString() ?? row.projectNo?.toString() ?? '',
                tenderName: row.tenderName?.toString() ?? row.projectName?.toString() ?? '',
                purpose: row.purpose as any,
                requestType: row.requestType,
                amountRequired: row.amountRequired ?? '0',
                dueDate: effectiveDueDate,
                bidValid: row.bidValid && effectiveDueDate
                    ? (() => {
                        const date = new Date(effectiveDueDate);
                        date.setDate(date.getDate() + row.bidValid);
                        return date;
                    })()
                    : null,
                teamMemberId: row.teamMemberId,
                teamMember: row.teamMember?.toString() ?? null,
                instrumentId: row.instrumentId,
                instrumentType: row.instrumentType as any,
                instrumentStatus: row.instrumentStatus,
                displayStatus: deriveDisplayStatus(row.instrumentStatus),
                createdAt: row.createdAt,
            };
        });

        const wrapped = wrapPaginatedResponse(data, totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    // ============================================================================
    // Tender DNB
    // ============================================================================

    async getTenderDnbTenders(
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<PendingTabResponse> {
        const roleFilterConditions = buildTenderRoleFilters(user, teamId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;
        const dnbStatusIds = StatusCache.getIds('dnb');

        const searchTerm = search?.trim();
        const searchConditions: any[] = [];
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.emd}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderFees}::text ILIKE ${searchStr}`,
                sql`${tenderInformation.processingFeeAmount}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`
            );
        }

        const whereClause = and(
            TenderInfosService.getActiveCondition(),
            TenderInfosService.getApprovedCondition(),
            TenderInfosService.getExcludeStatusCondition(['lost']),
            inArray(tenderInfos.status, dnbStatusIds),
            or(
                inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
            ),
            ...roleFilterConditions,
            searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
        );

        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause);

        const totalCount = Number(countResult?.count || 0);

        let orderClause: any;
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderClause = direction(tenderInfos.tenderName);
                    break;
                case 'dueDate':
                    orderClause = direction(tenderInfos.dueDate);
                    break;
                case 'teamMember':
                    orderClause = direction(users.name);
                    break;
                case 'emdRequired':
                    orderClause = direction(tenderInfos.emd);
                    break;
                default:
                    orderClause = getDefaultSortByTab('tender-dnb');
            }
        } else {
            orderClause = getDefaultSortByTab('tender-dnb');
        }

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                status: tenderInfos.status,
                statusName: statuses.name,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                processingFee: tenderInformation.processingFeeAmount,
                processingFeeMode: tenderInformation.processingFeeMode,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const data: PendingTenderRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo?.toString() || '',
            tenderName: row.tenderName?.toString() || '',
            gstValues: row.gstValues,
            status: row.status || 0,
            statusName: row.statusName?.toString() || null,
            dueDate: row.dueDate,
            teamMemberId: row.teamMemberId,
            teamMember: row.teamMember?.toString() || null,
            emd: row.emd?.toString() || null,
            emdMode: row.emdMode?.toString() || null,
            tenderFee: row.tenderFee?.toString() || null,
            tenderFeeMode: row.tenderFeeMode?.toString() || null,
            processingFee: row.processingFee?.toString() || null,
            processingFeeMode: row.processingFeeMode?.toString() || null,
        }));

        const wrapped = wrapPaginatedResponse(data, totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    // ============================================================================
    // Find Methods
    // ============================================================================

    async findByTenderId(tenderId: number) {
        const requests = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                type: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                dueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                status: paymentRequests.status,
                remarks: paymentRequests.remarks,
                createdAt: paymentRequests.createdAt,
                updatedAt: paymentRequests.updatedAt,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId));

        if (requests.length === 0) return null;

        const instruments = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentInstruments.requestId,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
            })
            .from(paymentInstruments)
            .where(and(
                sql`${paymentInstruments.requestId} IN ${sql`(${requests.map(r => r.id).join(',')})`}`,
                eq(paymentInstruments.isActive, true)
            ));

        return {
            requests: requests.map(request => ({
                ...this.mapPaymentRequest(request),
                instruments: instruments.filter(i => i.requestId === request.id).map(i => this.mapInstrumentBase(i)),
            })),
        };
    }

    async findByTenderIdWithTender(tenderId: number) {
        const requests = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                type: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                dueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                status: paymentRequests.status,
                remarks: paymentRequests.remarks,
                createdAt: paymentRequests.createdAt,
                updatedAt: paymentRequests.updatedAt,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId));

        if (requests.length === 0) return null;

        const [tender] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                team: tenderInfos.team,
                organization: tenderInfos.organization,
                item: tenderInfos.item,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                location: tenderInfos.location,
                website: tenderInfos.website,
                emdMode: tenderInfos.emdMode,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                deleteStatus: tenderInfos.deleteStatus,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        const instruments = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentInstruments.requestId,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
            })
            .from(paymentInstruments)
            .where(and(
                sql`${paymentInstruments.requestId} IN ${sql`(${requests.map(r => r.id).join(',')})`}`,
                eq(paymentInstruments.isActive, true)
            ));

        return {
            tender: this.mapTenderBasic(tender),
            requests: requests.map(request => ({
                ...this.mapPaymentRequest(request),
                instruments: instruments.filter(i => i.requestId === request.id).map(i => this.mapInstrumentBase(i)),
            })),
        };
    }

    async findById(requestId: number) {
        const [request] = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                type: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                dueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                status: paymentRequests.status,
                remarks: paymentRequests.remarks,
                createdAt: paymentRequests.createdAt,
                updatedAt: paymentRequests.updatedAt,
            })
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) return null;

        const instruments = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentInstruments.requestId,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
            })
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        return {
            ...this.mapPaymentRequest(request),
            instruments: instruments.map(i => this.mapInstrumentBase(i)),
        };
    }

async findByIdWithTender(requestId: number) {
        const [request] = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                type: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                dueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                requestedByName: users.name,
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                status: paymentRequests.status,
                remarks: paymentRequests.remarks,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) return null;

        const [tender] = await this.db
            .select({
                id: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                team: tenderInfos.team,
                organization: tenderInfos.organization,
                item: tenderInfos.item,
                gstValues: tenderInfos.gstValues,
                tenderFees: tenderInfos.tenderFees,
                emd: tenderInfos.emd,
                teamMember: tenderInfos.teamMember,
                dueDate: tenderInfos.dueDate,
                status: tenderInfos.status,
                location: tenderInfos.location,
                website: tenderInfos.website,
                emdMode: tenderInfos.emdMode,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                deleteStatus: tenderInfos.deleteStatus,
            })
            .from(tenderInfos)
            .where(eq(tenderInfos.id, request.tenderId))
            .limit(1);

        const instruments = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentInstruments.requestId,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
            })
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        const instrumentsWithDetails = await Promise.all(instruments.map(async (instrument) => {
            let details: any = null;
            if (instrument.instrumentType === 'DD') {
                [details] = await this.db.select({
                    ddNo: instrumentDdDetails.ddNo,
                    ddDate: instrumentDdDetails.ddDate,
                    reqNo: instrumentDdDetails.reqNo,
                    ddNeeds: instrumentDdDetails.ddNeeds,
                    ddPurpose: instrumentDdDetails.ddPurpose,
                    ddRemarks: instrumentDdDetails.ddRemarks,
                }).from(instrumentDdDetails).where(eq(instrumentDdDetails.instrumentId, instrument.id)).limit(1);
            } else if (instrument.instrumentType === 'FDR') {
                [details] = await this.db.select({
                    fdrNo: instrumentFdrDetails.fdrNo,
                    fdrDate: instrumentFdrDetails.fdrDate,
                    fdrSource: instrumentFdrDetails.fdrSource,
                    fdrExpiryDate: instrumentFdrDetails.fdrExpiryDate,
                    fdrNeeds: instrumentFdrDetails.fdrNeeds,
                    fdrRemark: instrumentFdrDetails.fdrRemark,
                }).from(instrumentFdrDetails).where(eq(instrumentFdrDetails.instrumentId, instrument.id)).limit(1);
            } else if (instrument.instrumentType === 'BG') {
                [details] = await this.db.select({
                    bgNo: instrumentBgDetails.bgNo,
                    bgDate: instrumentBgDetails.bgDate,
                    validityDate: instrumentBgDetails.validityDate,
                    claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                    beneficiaryName: instrumentBgDetails.beneficiaryName,
                    beneficiaryAddress: instrumentBgDetails.beneficiaryAddress,
                    bankName: instrumentBgDetails.bankName,
                    bgNeeds: instrumentBgDetails.bgNeeds,
                    bgPurpose: instrumentBgDetails.bgPurpose,
                }).from(instrumentBgDetails).where(eq(instrumentBgDetails.instrumentId, instrument.id)).limit(1);
            } else if (instrument.instrumentType === 'Cheque') {
                [details] = await this.db.select({
                    chequeNo: instrumentChequeDetails.chequeNo,
                    chequeDate: instrumentChequeDetails.chequeDate,
                    bankName: instrumentChequeDetails.bankName,
                    chequeNeeds: instrumentChequeDetails.chequeNeeds,
                    chequeReason: instrumentChequeDetails.chequeReason,
                }).from(instrumentChequeDetails).where(eq(instrumentChequeDetails.instrumentId, instrument.id)).limit(1);
            } else if (instrument.instrumentType === 'Bank Transfer' || instrument.instrumentType === 'Portal Payment') {
                [details] = await this.db.select({
                    utrNum: instrumentTransferDetails.utrNum,
                    transactionDate: instrumentTransferDetails.transactionDate,
                    accountName: instrumentTransferDetails.accountName,
                    accountNumber: instrumentTransferDetails.accountNumber,
                    ifsc: instrumentTransferDetails.ifsc,
                    reason: instrumentTransferDetails.reason,
                    remarks: instrumentTransferDetails.remarks,
                }).from(instrumentTransferDetails).where(eq(instrumentTransferDetails.instrumentId, instrument.id)).limit(1);
            }
            return this.mapInstrumentResponse(instrument, details);
        }));

        return {
            ...this.mapPaymentRequest(request),
            requestedByName: request.requestedByName,
            tender: this.mapTenderBasic(tender),
            instruments: instrumentsWithDetails,
        };
    }

    // ============================================================================
    // Response Mapping Helpers
    // ============================================================================
    // Response Mapping Helpers
    // ============================================================================

    private mapTenderBasic(tender: any) {
        if (!tender) return null;
        return {
            id: tender.id,
            tenderNo: tender.tenderNo?.toString() || '',
            tenderName: tender.tenderName?.toString() || '',
            team: tender.team,
            organization: tender.organization,
            item: tender.item,
            gstValues: tender.gstValues?.toString() || '0',
            tenderFees: tender.tenderFees?.toString() || '0',
            emd: tender.emd?.toString() || '0',
            teamMember: tender.teamMember,
            dueDate: tender.dueDate ? tender.dueDate.toISOString() : null,
            status: tender.status || 1,
            location: tender.location,
            website: tender.website,
            emdMode: tender.emdMode?.toString() || null,
            tenderFeeMode: tender.tenderFeeMode?.toString() || null,
            processingFeeMode: tender.processingFeeMode?.toString() || null,
            deleteStatus: tender.deleteStatus || 0,
        };
    }

    private mapPaymentRequest(request: any) {
        return {
            id: request.id,
            tenderId: request.tenderId,
            type: request.type,
            tenderNo: request.tenderNo?.toString() || '',
            projectName: request.projectName,
            dueDate: request.dueDate ? request.dueDate.toISOString() : null,
            requestedBy: request.requestedBy,
            purpose: request.purpose,
            amountRequired: request.amountRequired?.toString() || '0',
            status: request.status,
            remarks: request.remarks,
            createdAt: request.createdAt ? request.createdAt.toISOString() : null,
            updatedAt: request.updatedAt ? request.updatedAt.toISOString() : null,
        };
    }

    private mapInstrumentBase(instrument: any) {
        return {
            id: instrument.id,
            requestId: instrument.requestId,
            instrumentType: instrument.instrumentType,
            purpose: instrument.purpose,
            amount: instrument.amount?.toString() || '0',
            favouring: instrument.favouring,
            payableAt: instrument.payableAt,
            status: instrument.status,
            isActive: instrument.isActive,
        };
    }

    private mapInstrumentResponse(instrument: any, details: any): InstrumentResponse {
        const base = this.mapInstrumentBase(instrument);
        
        switch (instrument.instrumentType) {
            case 'DD':
                return {
                    ...base,
                    instrumentType: 'DD' as const,
                    details: details ? {
                        ddNo: details.ddNo,
                        ddDate: details.ddDate ? details.ddDate.toISOString() : null,
                        reqNo: details.reqNo,
                        ddNeeds: details.ddNeeds,
                        ddPurpose: details.ddPurpose,
                        ddRemarks: details.ddRemarks,
                    } : null,
                };
            case 'FDR':
                return {
                    ...base,
                    instrumentType: 'FDR' as const,
                    details: details ? {
                        fdrNo: details.fdrNo,
                        fdrDate: details.fdrDate ? details.fdrDate.toISOString() : null,
                        fdrSource: details.fdrSource,
                        fdrExpiryDate: details.fdrExpiryDate ? details.fdrExpiryDate.toISOString() : null,
                        fdrNeeds: details.fdrNeeds,
                        fdrRemark: details.fdrRemark,
                    } : null,
                };
            case 'BG':
                return {
                    ...base,
                    instrumentType: 'BG' as const,
                    details: details ? {
                        bgNo: details.bgNo,
                        bgDate: details.bgDate ? details.bgDate.toISOString() : null,
                        validityDate: details.validityDate ? details.validityDate.toISOString() : null,
                        claimExpiryDate: details.claimExpiryDate ? details.claimExpiryDate.toISOString() : null,
                        beneficiaryName: details.beneficiaryName,
                        beneficiaryAddress: details.beneficiaryAddress,
                        bankName: details.bankName,
                        bgNeeds: details.bgNeeds,
                        bgPurpose: details.bgPurpose,
                    } : null,
                };
            case 'Cheque':
                return {
                    ...base,
                    instrumentType: 'Cheque' as const,
                    details: details ? {
                        chequeNo: details.chequeNo,
                        chequeDate: details.chequeDate ? details.chequeDate.toISOString() : null,
                        bankName: details.bankName,
                        chequeNeeds: details.chequeNeeds,
                        chequeReason: details.chequeReason,
                    } : null,
                };
            case 'Bank Transfer':
                return {
                    ...base,
                    instrumentType: 'Bank Transfer' as const,
                    details: details ? {
                        utrNum: details.utrNum,
                        transactionDate: details.transactionDate ? new Date(details.transactionDate).toISOString() : null,
                        accountName: details.accountName,
                        accountNumber: details.accountNumber,
                        ifsc: details.ifsc,
                        reason: details.reason,
                        remarks: details.remarks,
                    } : null,
                };
            case 'Portal Payment':
                return {
                    ...base,
                    instrumentType: 'Portal Payment' as const,
                    details: details ? {
                        utrNum: details.utrNum,
                        transactionDate: details.transactionDate ? new Date(details.transactionDate).toISOString() : null,
                        accountName: details.accountName,
                        accountNumber: details.accountNumber,
                        ifsc: details.ifsc,
                        reason: details.reason,
                        remarks: details.remarks,
                    } : null,
                };
            default:
                return base as InstrumentResponse;
        }
    }
}