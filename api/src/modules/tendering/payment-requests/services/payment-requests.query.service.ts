import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { paymentRequests,  paymentInstruments } from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { 
    DashboardTab, 
    DashboardCounts, 
    PendingTabResponse, 
    RequestTabResponse,
    PaymentRequestRow,
    PendingTenderRow, 
} from '../dto/payment-requests.dto';
import {
    buildTenderRoleFilters,
    buildRequestRoleFilters,
    getDefaultSortByTab,
    getTabSqlCondition,
    deriveDisplayStatus,
} from './payment-requests.shared';
import { tenderInformation } from '@/db/schemas';

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
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(
                ...roleFilterConditions,
                eq(tenderInfos.tlStatus, 1),
                sql`${tenderInfos.emd}::numeric > 0 OR ${tenderInfos.tenderFees}::numeric > 0`
            ));

        return Number(result?.count || 0);
    }

    private async countRequestsByStatus(
        user?: ValidatedUser, 
        teamId?: number
    ): Promise<{ sent: number; approved: number; rejected: number; returned: number; }> {
        const roleFilterConditions = buildRequestRoleFilters(user, teamId);
        const tabCondition = getTabSqlCondition('sent');

        const [result] = await this.db
            .select({
                sent: sql<number>`COALESCE(SUM(CASE WHEN ${tabCondition} THEN 1 ELSE 0 END), 0)`,
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

        const [result] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(and(
                ...roleFilterConditions,
                eq(tenderInfos.tlStatus, 1),
                sql`${tenderInfos.emd}::numeric > 0`
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
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`
            );
        }

        const whereClause = and(
            ...roleFilterConditions,
            eq(tenderInfos.tlStatus, 1),
            sql`${tenderInfos.emd}::numeric > 0 OR ${tenderInfos.tenderFees}::numeric > 0`,
            searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
        );

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(whereClause);

        const totalCount = Number(countResult?.count || 0);

        const direction = sort?.sortOrder === 'desc' ? desc : asc;
        const orderBy = sort?.sortBy 
            ? direction(tenderInfos.tenderNo)
            : sql`${tenderInfos.dueDate} ASC NULLS LAST`;

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                status: tenderInfos.status,
                statusName: sql`${tenderInfos.status}::text`,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        const data: PendingTenderRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo?.toString() || '',
            tenderName: row.tenderName?.toString() || '',
            gstValues: row.gstValues,
            status: row.status || 0,
            statusName: null,
            dueDate: row.dueDate,
            teamMemberId: row.teamMemberId,
            teamMember: row.teamMember?.toString() || null,
            emd: row.emd?.toString() || null,
            emdMode: row.emdMode?.toString() || null,
            tenderFee: row.tenderFee?.toString() || null,
            tenderFeeMode: row.tenderFeeMode?.toString() || null,
            processingFee: null,
            processingFeeMode: null,
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
                sql`${paymentRequests.projectName} ILIKE ${searchStr}`
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

        const whereClause = and(
            ...roleFilterConditions,
            eq(tenderInfos.tlStatus, 1),
            sql`${tenderInfos.emd}::numeric > 0`
        );

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(whereClause);

        const totalCount = Number(countResult?.count || 0);

        const direction = sort?.sortOrder === 'desc' ? desc : asc;
        const orderBy = sort?.sortBy 
            ? direction(tenderInfos.tenderNo)
            : sql`${tenderInfos.dueDate} ASC NULLS LAST`;

        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                gstValues: tenderInfos.gstValues,
                status: tenderInfos.status,
                statusName: sql`${tenderInfos.status}::text`,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .where(whereClause)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        const data: PendingTenderRow[] = rows.map(row => ({
            tenderId: row.tenderId,
            tenderNo: row.tenderNo?.toString() || '',
            tenderName: row.tenderName?.toString() || '',
            gstValues: row.gstValues,
            status: row.status || 0,
            statusName: null,
            dueDate: row.dueDate,
            teamMemberId: row.teamMemberId,
            teamMember: row.teamMember?.toString() || null,
            emd: row.emd?.toString() || null,
            emdMode: row.emdMode?.toString() || null,
            tenderFee: row.tenderFee?.toString() || null,
            tenderFeeMode: row.tenderFeeMode?.toString() || null,
            processingFee: null,
            processingFeeMode: null,
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
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId));

        if (requests.length === 0) return null;

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                sql`${paymentInstruments.requestId} IN ${sql`(${requests.map(r => r.id).join(',')})`}`,
                eq(paymentInstruments.isActive, true)
            ));

        return {
            requests: requests.map(request => ({
                ...request,
                instruments: instruments.filter(i => i.requestId === request.id),
            })),
        };
    }

    async findByTenderIdWithTender(tenderId: number) {
        const requests = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId));

        if (requests.length === 0) return null;

        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, tenderId))
            .limit(1);

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                sql`${paymentInstruments.requestId} IN ${sql`(${requests.map(r => r.id).join(',')})`}`,
                eq(paymentInstruments.isActive, true)
            ));

        return {
            tender,
            requests: requests.map(request => ({
                ...request,
                instruments: instruments.filter(i => i.requestId === request.id),
            })),
        };
    }

    async findById(requestId: number) {
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) return null;

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        return {
            ...request,
            instruments,
        };
    }

    async findByIdWithTender(requestId: number) {
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) return null;

        const [tender] = await this.db
            .select()
            .from(tenderInfos)
            .where(eq(tenderInfos.id, request.tenderId))
            .limit(1);

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(and(
                eq(paymentInstruments.requestId, requestId),
                eq(paymentInstruments.isActive, true)
            ));

        return {
            ...request,
            tender,
            instruments,
        };
    }
}