import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, or, inArray, isNull, sql, asc, desc, ne } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentBgDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { BankGuaranteeDashboardRow, BankGuaranteeDashboardCounts } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';

@Injectable()
export class BankGuaranteeService {
    private readonly logger = new Logger(BankGuaranteeService.name);

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
    ): Promise<PaginatedResult<BankGuaranteeDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'BG'),
            eq(paymentInstruments.isActive, true),
        ];

        // Apply tab-specific filters
        if (tab === 'new-requests') {
            conditions.push(
                or(
                    isNull(paymentInstruments.action),
                    eq(paymentInstruments.action, 1)
                ),
                eq(paymentRequests.status, 'Accepted')
            );
        } else if (tab === 'live-yes') {
            conditions.push(
                inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
                inArray(instrumentBgDetails.bankName, ['YESBANK_2011', 'YESBANK_0771'])
            );
        } else if (tab === 'live-pnb') {
            conditions.push(
                inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
                eq(instrumentBgDetails.bankName, 'PNB_6011')
            );
        } else if (tab === 'live-bg-limit') {
            conditions.push(
                inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
                eq(instrumentBgDetails.bankName, 'BGLIMIT_0771')
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                inArray(paymentInstruments.action, [8, 9])
            );
        } else if (tab === 'rejected') {
            conditions.push(
                eq(paymentInstruments.action, 1),
                eq(paymentRequests.status, 'Rejected')
            );
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentBgDetails.bgNo} ILIKE ${searchStr} OR
                    ${instrumentBgDetails.beneficiaryName} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build order clause
        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'bgDate':
                    orderClause = direction(instrumentBgDetails.bgDate);
                    break;
                case 'bgNo':
                    orderClause = direction(instrumentBgDetails.bgNo);
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
                bgDate: instrumentBgDetails.bgDate,
                bgNo: instrumentBgDetails.bgNo,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                bidValidity: tenderInfos.dueDate,
                amount: paymentInstruments.amount,
                bgExpiryDate: instrumentBgDetails.validityDate,
                bgClaimPeriod: sql<number | null>`EXTRACT(DAY FROM (${instrumentBgDetails.claimExpiryDate} - ${instrumentBgDetails.validityDate}))`,
                expiryDate: instrumentBgDetails.claimExpiryDate,
                bgChargesPaid: sql<number | null>`COALESCE(${instrumentBgDetails.stampChargesDeducted}, 0) + COALESCE(${instrumentBgDetails.sfmsChargesDeducted}, 0) + COALESCE(${instrumentBgDetails.otherChargesDeducted}, 0)`,
                bgChargesCalculated: sql<number | null>`COALESCE(${instrumentBgDetails.stampCharges}, 0) + COALESCE(${instrumentBgDetails.sfmsCharges}, 0)`,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrValue: instrumentBgDetails.fdrAmt,
                tenderStatus: statuses.name,
                expiry: instrumentBgDetails.validityDate,
                bgStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
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
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: BankGuaranteeDashboardRow[] = rows.map((row) => ({
            id: row.id,
            bgDate: row.bgDate ? new Date(row.bgDate) : null,
            bgNo: row.bgNo,
            beneficiaryName: row.beneficiaryName,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            amount: row.amount ? Number(row.amount) : null,
            bgExpiryDate: row.bgExpiryDate ? new Date(row.bgExpiryDate) : null,
            bgClaimPeriod: row.bgClaimPeriod ? Number(row.bgClaimPeriod) : null,
            expiryDate: row.expiryDate ? new Date(row.expiryDate) : null,
            bgChargesPaid: row.bgChargesPaid ? Number(row.bgChargesPaid) : null,
            bgChargesCalculated: row.bgChargesCalculated ? Number(row.bgChargesCalculated) : null,
            fdrNo: row.fdrNo,
            fdrValue: row.fdrValue ? Number(row.fdrValue) : null,
            tenderStatus: row.tenderStatus,
            expiry: row.expiry ? new Date(row.expiry) : null,
            bgStatus: row.bgStatus,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<BankGuaranteeDashboardCounts> {
        const baseConditions = [
            eq(paymentInstruments.instrumentType, 'BG'),
            eq(paymentInstruments.isActive, true),
        ];

        // Count new-requests
        const newRequestsConditions = [
            ...baseConditions,
            or(
                isNull(paymentInstruments.action),
                eq(paymentInstruments.action, 1)
            ),
            eq(paymentRequests.status, 'Accepted'),
        ];
        const [newRequestsResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...newRequestsConditions));
        const newRequests = Number(newRequestsResult?.count || 0);

        // Count live-yes
        const liveYesConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            inArray(instrumentBgDetails.bankName, ['YESBANK_2011', 'YESBANK_0771']),
        ];
        const [liveYesResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(...liveYesConditions));
        const liveYes = Number(liveYesResult?.count || 0);

        // Count live-pnb
        const livePnbConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            eq(instrumentBgDetails.bankName, 'PNB_6011'),
        ];
        const [livePnbResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(...livePnbConditions));
        const livePnb = Number(livePnbResult?.count || 0);

        // Count live-bg-limit
        const liveBgLimitConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            eq(instrumentBgDetails.bankName, 'BGLIMIT_0771'),
        ];
        const [liveBgLimitResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(...liveBgLimitConditions));
        const liveBgLimit = Number(liveBgLimitResult?.count || 0);

        // Count cancelled
        const cancelledConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [8, 9]),
        ];
        const [cancelledResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...cancelledConditions));
        const cancelled = Number(cancelledResult?.count || 0);

        // Count rejected
        const rejectedConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 1),
            eq(paymentRequests.status, 'Rejected'),
        ];
        const [rejectedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...rejectedConditions));
        const rejected = Number(rejectedResult?.count || 0);

        return {
            'new-requests': newRequests,
            'live-yes': liveYes,
            'live-pnb': livePnb,
            'live-bg-limit': liveBgLimit,
            cancelled,
            rejected,
            total: newRequests + liveYes + livePnb + liveBgLimit + cancelled + rejected,
        };
    }
}
