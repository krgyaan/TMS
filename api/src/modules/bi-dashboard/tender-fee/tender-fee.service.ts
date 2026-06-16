import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { couriers } from '@/db/schemas/shared/couriers.schema';
import { followUps } from '@/db/schemas/shared/follow-ups.schema';
import { paymentRequests, paymentInstruments, instrumentDdDetails, instrumentTransferDetails, instrumentChequeDetails } from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { TenderFeeDDDashboardRow, TenderFeeDDDashboardCounts, TenderFeePortalDashboardRow, TenderFeePortalDashboardCounts, TenderFeeTransferDashboardRow, TenderFeeTransferDashboardCounts } from '@/modules/bi-dashboard/tender-fee/helpers/tenderFee.types';
import { DD_STATUSES, BT_STATUSES, PORTAL_STATUSES, CHEQUE_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';

@Injectable()
export class TenderFeeService {
    private readonly logger = new Logger(TenderFeeService.name);
    private readonly requesterUser = alias(users, 'requester');

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    // ───────────────────── DD Dashboard ─────────────────────

    private deriveDdStatus(status: string | null): string {
        const map: Record<string, string> = {
            [DD_STATUSES.PENDING]: 'Pending',
            [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'DD Created',
            [DD_STATUSES.ACCOUNTS_FORM_REJECTED]: 'DD Rejected',
            [DD_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [DD_STATUSES.RETURN_VIA_COURIER]: 'Returned via courier',
            [DD_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned via Bank Transfer',
            [DD_STATUSES.SETTLED_WITH_PROJECT]: 'Settled with Project Account',
            [DD_STATUSES.CANCELLATION_REQUESTED]: 'DD Cancellation request sent to branch',
            [DD_STATUSES.CANCELLED]: 'DD Cancelled at Branch',
        };
        return map[status as string] || status || 'Pending';
    }

    private deriveDdExpiryStatus(ddCreationDate: Date | null): string {
        if (!ddCreationDate) return 'No date';
        const expiryDate = new Date(ddCreationDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
        return expiryDate < new Date() ? 'Expired' : 'Valid';
    }

    private buildDDConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'DD'),
            eq(paymentInstruments.isActive, true),
            sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, DD_STATUSES.PENDING)
                )
            );
        } else if (tab === 'created') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                inArray(paymentInstruments.status, [DD_STATUSES.ACCOUNTS_FORM_ACCEPTED, DD_STATUSES.FOLLOWUP_INITIATED])
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, DD_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(
                inArray(paymentInstruments.action, [3, 4, 5])
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                inArray(paymentInstruments.action, [6, 7])
            );
        }

        return conditions;
    }

    async getDDDashboardData(
        tab?: string,
        options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; teamId?: number },
    ): Promise<PaginatedResult<TenderFeeDDDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildDDConditions(tab);

        const searchTerm = options?.search?.trim();
        const teamId = options?.teamId;
        if (teamId) {
            conditions.push(sql`COALESCE(${tenderInfos.team}, ${users.team}) = ${teamId}`);
        }

        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentDdDetails.ddNo} ILIKE ${searchStr}`,
                sql`${paymentInstruments.favouring} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${instrumentDdDetails.ddDate}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'ddCreationDate':
                    orderClause = direction(instrumentDdDetails.ddDate);
                    break;
                case 'ddNo':
                    orderClause = direction(instrumentDdDetails.ddNo);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'ddAmount':
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                purpose: paymentRequests.purpose,
                ddCreationDate: instrumentDdDetails.ddDate,
                ddNo: instrumentDdDetails.ddNo,
                beneficiaryName: paymentInstruments.favouring,
                ddAmount: paymentInstruments.amount,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                teamMember: users.name,
                ddStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentDdDetails, eq(instrumentDdDetails.instrumentId, paymentInstruments.id));
        if (searchTerm || teamId) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
                .leftJoin(users, eq(users.id, paymentRequests.requestedBy));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: TenderFeeDDDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            ddCreationDate: row.ddCreationDate ? new Date(row.ddCreationDate) : null,
            ddNo: row.ddNo,
            beneficiaryName: row.beneficiaryName,
            ddAmount: row.ddAmount ? Number(row.ddAmount) : null,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            teamMember: row.teamMember?.toString() ?? null,
            expiry: this.deriveDdExpiryStatus(row.ddCreationDate ? new Date(row.ddCreationDate) : null),
            ddStatus: this.deriveDdStatus(row.ddStatus),
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countDDByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));
        return Number(result?.count || 0);
    }

    async getDDDashboardCounts(): Promise<TenderFeeDDDashboardCounts> {
        const pending = await this.countDDByConditions(this.buildDDConditions('pending'));
        const created = await this.countDDByConditions(this.buildDDConditions('created'));
        const rejected = await this.countDDByConditions(this.buildDDConditions('rejected'));
        const returned = await this.countDDByConditions(this.buildDDConditions('returned'));
        const cancelled = await this.countDDByConditions(this.buildDDConditions('cancelled'));
        return { pending, created, rejected, returned, cancelled, total: pending + created + rejected + returned + cancelled };
    }

    // ───────────────────── Portal Dashboard ─────────────────────

    private portalStatusMap() {
        return {
            [PORTAL_STATUSES.PENDING]: 'Pending',
            [PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned',
            [PORTAL_STATUSES.SETTLED_WITH_PROJECT]: 'Settled',
        };
    }

    private buildPortalConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Portal Payment'),
            eq(paymentInstruments.isActive, true),
            sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, PORTAL_STATUSES.PENDING)
                )
            );
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                inArray(paymentInstruments.status, [PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED, PORTAL_STATUSES.FOLLOWUP_INITIATED])
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(
                inArray(paymentInstruments.action, [3])
            );
        } else if (tab === 'settled') {
            conditions.push(
                inArray(paymentInstruments.action, [4])
            );
        }

        return conditions;
    }

    async getPortalDashboardData(
        tab?: string,
        options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; teamId?: number },
    ): Promise<PaginatedResult<TenderFeePortalDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildPortalConditions(tab);

        const searchTerm = options?.search?.trim();
        const teamId = options?.teamId;
        if (teamId) {
            conditions.push(sql`COALESCE(${tenderInfos.team}, ${this.requesterUser.team}) = ${teamId}`);
        }

        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.utrNum} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.portalName} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.transactionDate}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'date':
                    orderClause = direction(instrumentTransferDetails.transactionDate);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'amount':
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                purpose: paymentRequests.purpose,
                date: instrumentTransferDetails.transactionDate,
                teamMember: users.name,
                utrNo: instrumentTransferDetails.utrNum,
                portalName: instrumentTransferDetails.portalName,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                amount: paymentInstruments.amount,
                popStatus: paymentInstruments.status,
                action: paymentInstruments.action,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(this.requesterUser, eq(this.requesterUser.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id));
        if (searchTerm || teamId) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(users, eq(users.id, tenderInfos.teamMember))
                .leftJoin(this.requesterUser, eq(this.requesterUser.id, paymentRequests.requestedBy))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: TenderFeePortalDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember,
            utrNo: row.utrNo,
            portalName: row.portalName,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            popStatus: this.portalStatusMap()[row.popStatus],
            action: row.action,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countPortalByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));
        return Number(result?.count || 0);
    }

    async getPortalDashboardCounts(): Promise<TenderFeePortalDashboardCounts> {
        const pending = await this.countPortalByConditions(this.buildPortalConditions('pending'));
        const accepted = await this.countPortalByConditions(this.buildPortalConditions('accepted'));
        const rejected = await this.countPortalByConditions(this.buildPortalConditions('rejected'));
        const returned = await this.countPortalByConditions(this.buildPortalConditions('returned'));
        const settled = await this.countPortalByConditions(this.buildPortalConditions('settled'));
        return { pending, accepted, rejected, returned, settled, total: pending + accepted + rejected + returned + settled };
    }

    // ───────────────────── Bank Transfer Dashboard ─────────────────────

    private transferStatusMap() {
        return {
            [BT_STATUSES.PENDING]: 'Pending',
            [BT_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [BT_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [BT_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [BT_STATUSES.RETURN_VIA_BANK_TRANSFER]: 'Returned',
            [BT_STATUSES.SETTLED_WITH_PROJECT]: 'Settled',
        };
    }

    private buildTransferConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Bank Transfer'),
            eq(paymentInstruments.isActive, true),
            sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
        ];

        if (tab === 'pending') {
            conditions.push(
                or(
                    eq(paymentInstruments.action, 0),
                    eq(paymentInstruments.status, BT_STATUSES.PENDING)
                )
            );
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                inArray(paymentInstruments.status, [BT_STATUSES.ACCOUNTS_FORM_ACCEPTED, BT_STATUSES.FOLLOWUP_INITIATED])
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, BT_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(
                inArray(paymentInstruments.action, [3])
            );
        } else if (tab === 'settled') {
            conditions.push(
                inArray(paymentInstruments.action, [4])
            );
        }

        return conditions;
    }

    async getTransferDashboardData(
        tab?: string,
        options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string; teamId?: number },
    ): Promise<PaginatedResult<TenderFeeTransferDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildTransferConditions(tab);

        const searchTerm = options?.search?.trim();
        const teamId = options?.teamId;
        if (teamId) {
            conditions.push(sql`COALESCE(${tenderInfos.team}, ${users.team}) = ${teamId}`);
        }

        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.utrNum} ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.accountName} ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${instrumentTransferDetails.transactionDate}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'date':
                    orderClause = direction(instrumentTransferDetails.transactionDate);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'amount':
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = direction(paymentInstruments.createdAt);
            }
        }

        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                purpose: paymentRequests.purpose,
                date: instrumentTransferDetails.transactionDate,
                teamMember: users.name,
                utrNo: instrumentTransferDetails.utrNum,
                accountName: instrumentTransferDetails.accountName,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                tenderNo: tenderInfos.tenderNo,
                projectNo: paymentRequests.tenderNo,
                bidValidity: tenderInfos.dueDate,
                tenderStatus: statuses.name,
                amount: paymentInstruments.amount,
                btStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id));
        if (searchTerm || teamId) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: TenderFeeTransferDashboardRow[] = rows.map((row) => ({
            id: row.id,
            requestId: row.requestId,
            purpose: row.purpose,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember?.toString() ?? null,
            member: row.teamMember?.toString() ?? null,
            utrNo: row.utrNo,
            accountName: row.accountName,
            tenderName: row.tenderName || row.projectName,
            tenderNo: row.tenderNo || row.projectNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            btStatus: this.transferStatusMap()[row.btStatus],
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countTransferByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...conditions));
        return Number(result?.count || 0);
    }

    async getTransferDashboardCounts(): Promise<TenderFeeTransferDashboardCounts> {
        const pending = await this.countTransferByConditions(this.buildTransferConditions('pending'));
        const accepted = await this.countTransferByConditions(this.buildTransferConditions('accepted'));
        const rejected = await this.countTransferByConditions(this.buildTransferConditions('rejected'));
        const returned = await this.countTransferByConditions(this.buildTransferConditions('returned'));
        const settled = await this.countTransferByConditions(this.buildTransferConditions('settled'));
        return { pending, accepted, rejected, returned, settled, total: pending + accepted + rejected + returned + settled };
    }

    // ───────────────────── Shared helpers for delegation ─────────────────────

    private async resolveInstrument(instrumentId: number) {
        const [instrument] = await this.db
            .select({ instrumentType: paymentInstruments.instrumentType })
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);
        if (!instrument) throw new NotFoundException(`Instrument ${instrumentId} not found`);
        return instrument;
    }

    private resolveInstrumentFromDbRow(row: any) {
        if (!row) throw new NotFoundException('Instrument not found');
        return row.instrumentType;
    }

    async getById(id: number) {
        const [result] = await this.db
            .select({
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                purpose: paymentInstruments.purpose,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                validityDate: paymentInstruments.validityDate,
                claimExpiryDate: paymentInstruments.claimExpiryDate,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                courierDeadline: paymentInstruments.courierDeadline,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                isActive: paymentInstruments.isActive,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                coveringLetter: paymentInstruments.coveringLetter,
                extraPdfPaths: paymentInstruments.extraPdfPaths,
                createdAt: paymentInstruments.createdAt,
                updatedAt: paymentInstruments.updatedAt,
                requestId: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                requestType: paymentRequests.type,
                tenderNo: paymentRequests.tenderNo,
                projectName: paymentRequests.projectName,
                requestDueDate: paymentRequests.dueDate,
                requestedBy: paymentRequests.requestedBy,
                requestPurpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                requestStatus: paymentRequests.status,
                requestRemarks: paymentRequests.remarks,
                requestCreatedAt: paymentRequests.createdAt,
                requestUpdatedAt: paymentRequests.updatedAt,
                tenderName: tenderInfos.tenderName,
                tenderDueDate: tenderInfos.dueDate,
                tenderStatusId: tenderInfos.status,
                tenderOrganizationId: tenderInfos.organization,
                tenderItemId: tenderInfos.item,
                tenderTeamMember: tenderInfos.teamMember,
                tenderStatusName: statuses.name,
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.isActive, true),
                sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        return { ...result, instrumentType: result.instrumentType };
    }

    async getActionFormData(instrumentId: number) {
        const [result] = await this.db
            .select({
                id: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
                amount: paymentInstruments.amount,
                favouring: paymentInstruments.favouring,
                payableAt: paymentInstruments.payableAt,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                utr: paymentInstruments.utr,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                courierDeadline: paymentInstruments.courierDeadline,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                tenderNo: paymentRequests.tenderNo,
                tenderName: paymentRequests.projectName,
                tenderId: paymentRequests.tenderId,
                requestPurpose: paymentRequests.purpose,
                tenderStatusName: statuses.name,
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentInstruments.id, instrumentId),
                eq(paymentInstruments.isActive, true),
                sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${instrumentId} not found`);
        }

        const hasAccountsFormData = result.action != null && result.action >= 1;
        const hasReturnedData = result.action != null && result.action >= 3;
        const hasSettledData = result.action === 5 || result.action === 7;

        return {
            id: result.id,
            instrumentType: result.instrumentType,
            action: result.action,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            tenderStatusName: result.tenderStatusName,
            requestedByName: result.requestedByName || null,
            courierAddress: result.courierAddress,
            courierAddressJson: result.courierAddressJson as Record<string, any> | null,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            utr: result.utr,
            docketNo: result.docketNo,
            generatedPdf: result.generatedPdf,
            cancelPdf: result.cancelPdf,
            docketSlip: result.docketSlip,
            hasAccountsFormData,
            hasReturnedData,
            hasSettledData,
        };
    }

    async getFollowupData(instrumentId: number) {
        const [result] = await this.db
            .select({
                id: followUps.id,
                emdId: followUps.emdId,
                partyName: followUps.partyName,
                area: followUps.area,
                amount: followUps.amount,
                contacts: followUps.contacts,
                frequency: followUps.frequency,
                startFrom: followUps.startFrom,
                nextFollowUpDate: followUps.nextFollowUpDate,
                stopReason: followUps.stopReason,
                proofText: followUps.proofText,
                stopRemarks: followUps.stopRemarks,
                proofImagePath: followUps.proofImagePath,
                assignmentStatus: followUps.assignmentStatus,
                createdAt: followUps.createdAt,
            })
            .from(followUps)
            .where(and(
                eq(followUps.emdId, instrumentId),
                isNull(followUps.deletedAt)
            ))
            .orderBy(desc(followUps.createdAt))
            .limit(1);

        if (!result) {
            return null;
        }

        return {
            id: result.id,
            organisationName: result.partyName,
            area: result.area,
            amount: result.amount ? Number(result.amount) : null,
            contacts: result.contacts || [],
            frequency: result.frequency,
            followupStartDate: result.startFrom ? new Date(result.startFrom) : null,
            nextFollowUpDate: result.nextFollowUpDate ? new Date(result.nextFollowUpDate) : null,
            stopReason: result.stopReason,
            proofText: result.proofText,
            stopRemarks: result.stopRemarks,
            proofImagePath: result.proofImagePath,
            assignmentStatus: result.assignmentStatus,
            createdAt: result.createdAt,
        };
    }
}
