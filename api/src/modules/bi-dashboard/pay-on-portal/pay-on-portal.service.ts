import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentTransferDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { PayOnPortalDashboardRow, PayOnPortalDashboardCounts } from '@/modules/bi-dashboard/pay-on-portal/helpers/payOnPortal.types';

@Injectable()
export class PayOnPortalService {
    private readonly logger = new Logger(PayOnPortalService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        },
    ): Promise<PaginatedResult<PayOnPortalDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Portal Payment'),
            eq(paymentInstruments.isActive, true),
        ];

        // Apply tab-specific filters
        if (tab === 'pending') {
            conditions.push(isNull(paymentInstruments.action));
        } else if (tab === 'accepted') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, 'Accepted')
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, 'Rejected')
            );
        } else if (tab === 'returned') {
            conditions.push(inArray(paymentInstruments.action, [3, 4]));
        } else if (tab === 'settled') {
            conditions.push(eq(paymentInstruments.action, 4));
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentTransferDetails.utrNum} ILIKE ${searchStr} OR
                    ${instrumentTransferDetails.portalName} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build order clause
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

        // Data query
        const rows = await this.db
            .select({
                id: paymentInstruments.id,
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
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentTransferDetails, eq(instrumentTransferDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: PayOnPortalDashboardRow[] = rows.map((row) => ({
            id: row.id,
            date: row.date ? new Date(row.date) : null,
            teamMember: row.teamMember,
            utrNo: row.utrNo,
            portalName: row.portalName,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            tenderStatus: row.tenderStatus,
            amount: row.amount ? Number(row.amount) : null,
            popStatus: row.popStatus,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<PayOnPortalDashboardCounts> {
        const baseConditions = [
            eq(paymentInstruments.instrumentType, 'Portal Payment'),
            eq(paymentInstruments.isActive, true),
        ];

        // Count pending
        const pendingConditions = [
            ...baseConditions,
            isNull(paymentInstruments.action),
        ];
        const [pendingResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...pendingConditions));
        const pending = Number(pendingResult?.count || 0);

        // Count accepted
        const acceptedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, 'Accepted'),
        ];
        const [acceptedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...acceptedConditions));
        const accepted = Number(acceptedResult?.count || 0);

        // Count rejected
        const rejectedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, 'Rejected'),
        ];
        const [rejectedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...rejectedConditions));
        const rejected = Number(rejectedResult?.count || 0);

        // Count returned
        const returnedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [3, 4]),
        ];
        const [returnedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...returnedConditions));
        const returned = Number(returnedResult?.count || 0);

        // Count settled
        const settledConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 4),
        ];
        const [settledResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...settledConditions));
        const settled = Number(settledResult?.count || 0);

        return {
            pending,
            accepted,
            rejected,
            returned,
            settled,
            total: pending + accepted + rejected + returned + settled,
        };
    }
}
