import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, isNotNull, sql, asc, desc, ne, notInArray, or } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentChequeDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { ChequeDashboardRow, ChequeDashboardCounts } from '@/modules/bi-dashboard/cheque/helpers/cheque.types';

@Injectable()
export class ChequeService {
    private readonly logger = new Logger(ChequeService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) {}

    /**
     * Get expired cheque IDs (cheques where dueDate + 3 months < CURRENT_DATE)
     */
    private async getExpiredChequeIds(): Promise<number[]> {
        const expiredCheques = await this.db
            .select({ id: instrumentChequeDetails.id })
            .from(instrumentChequeDetails)
            .where(
                and(
                    isNotNull(instrumentChequeDetails.dueDate),
                    sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' < CURRENT_DATE`
                )
            );

        return expiredCheques.map((c) => c.id);
    }

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        },
    ): Promise<PaginatedResult<ChequeDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        // Get expired cheque IDs
        const expiredChequeIds = await this.getExpiredChequeIds();

        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Cheque'),
            eq(paymentInstruments.isActive, true),
        ];

        // Apply tab-specific filters
        if (tab === 'cheque-pending') {
            conditions.push(
                isNull(paymentInstruments.action),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'cheque-payable') {
            conditions.push(
                eq(instrumentChequeDetails.chequeReason, 'Payable'),
                eq(paymentInstruments.action, 1),
                ne(paymentInstruments.status, 'Rejected'),
                ne(paymentInstruments.action, 6),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'cheque-paid-stop') {
            conditions.push(
                inArray(paymentInstruments.action, [3, 4, 5]),
                ne(paymentInstruments.status, 'Rejected'),
                ne(paymentInstruments.action, 6),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'cheque-for-security') {
            conditions.push(
                eq(instrumentChequeDetails.chequeReason, 'Security'),
                ne(paymentInstruments.status, 'Rejected'),
                ne(paymentInstruments.action, 6),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'cheque-for-dd-fdr') {
            conditions.push(
                inArray(instrumentChequeDetails.chequeReason, ['DD', 'FDR', 'EMD']),
                ne(paymentInstruments.status, 'Rejected'),
                ne(paymentInstruments.action, 6),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'rejected') {
            conditions.push(
                eq(paymentInstruments.status, 'Rejected'),
                ne(paymentInstruments.action, 6),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                eq(paymentInstruments.action, 6),
                ne(paymentInstruments.status, 'Rejected'),
                expiredChequeIds.length > 0 ? notInArray(instrumentChequeDetails.id, expiredChequeIds) : sql`1=1`
            );
        } else if (tab === 'expired') {
            // Expired tab explicitly fetches expired cheques
            conditions.push(
                isNotNull(instrumentChequeDetails.dueDate),
                sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' < CURRENT_DATE`
            );
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentChequeDetails.chequeNo} ILIKE ${searchStr} OR
                    ${instrumentChequeDetails.chequeReason} ILIKE ${searchStr}
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
                    orderClause = direction(instrumentChequeDetails.chequeDate);
                    break;
                case 'chequeNo':
                    orderClause = direction(instrumentChequeDetails.chequeNo);
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
                date: instrumentChequeDetails.chequeDate,
                chequeNo: instrumentChequeDetails.chequeNo,
                payeeName: sql<string | null>`NULL`, // Cheque doesn't have payeeName in schema
                bidValidity: tenderInfos.dueDate,
                amount: paymentInstruments.amount,
                type: instrumentChequeDetails.chequeReason,
                cheque: sql<string | null>`NULL`, // Not in schema
                dueDate: instrumentChequeDetails.dueDate,
                expiry: sql<Date | null>`${instrumentChequeDetails.dueDate} + INTERVAL '3 months'`,
                chequeStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
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
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: ChequeDashboardRow[] = rows.map((row) => ({
            id: row.id,
            date: row.date ? new Date(row.date) : null,
            chequeNo: row.chequeNo,
            payeeName: row.payeeName,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            amount: row.amount ? Number(row.amount) : null,
            type: row.type,
            cheque: row.cheque,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            expiry: row.expiry ? new Date(row.expiry) : null,
            chequeStatus: row.chequeStatus,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<ChequeDashboardCounts> {
        // Get expired cheque IDs
        const expiredChequeIds = await this.getExpiredChequeIds();

        const baseConditions = [
            eq(paymentInstruments.instrumentType, 'Cheque'),
            eq(paymentInstruments.isActive, true),
        ];

        const excludeExpiredCondition = expiredChequeIds.length > 0
            ? notInArray(instrumentChequeDetails.id, expiredChequeIds)
            : sql`1=1`;

        // Count cheque-pending
        const chequePendingConditions = [
            ...baseConditions,
            isNull(paymentInstruments.action),
            excludeExpiredCondition,
        ];
        const [chequePendingResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...chequePendingConditions));
        const chequePending = Number(chequePendingResult?.count || 0);

        // Count cheque-payable
        const chequePayableConditions = [
            ...baseConditions,
            eq(instrumentChequeDetails.chequeReason, 'Payable'),
            eq(paymentInstruments.action, 1),
            ne(paymentInstruments.status, 'Rejected'),
            ne(paymentInstruments.action, 6),
            excludeExpiredCondition,
        ];
        const [chequePayableResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...chequePayableConditions));
        const chequePayable = Number(chequePayableResult?.count || 0);

        // Count cheque-paid-stop
        const chequePaidStopConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [3, 4, 5]),
            ne(paymentInstruments.status, 'Rejected'),
            ne(paymentInstruments.action, 6),
            excludeExpiredCondition,
        ];
        const [chequePaidStopResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...chequePaidStopConditions));
        const chequePaidStop = Number(chequePaidStopResult?.count || 0);

        // Count cheque-for-security
        const chequeForSecurityConditions = [
            ...baseConditions,
            eq(instrumentChequeDetails.chequeReason, 'Security'),
            ne(paymentInstruments.status, 'Rejected'),
            ne(paymentInstruments.action, 6),
            excludeExpiredCondition,
        ];
        const [chequeForSecurityResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...chequeForSecurityConditions));
        const chequeForSecurity = Number(chequeForSecurityResult?.count || 0);

        // Count cheque-for-dd-fdr
        const chequeForDdFdrConditions = [
            ...baseConditions,
            inArray(instrumentChequeDetails.chequeReason, ['DD', 'FDR', 'EMD']),
            ne(paymentInstruments.status, 'Rejected'),
            ne(paymentInstruments.action, 6),
            excludeExpiredCondition,
        ];
        const [chequeForDdFdrResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...chequeForDdFdrConditions));
        const chequeForDdFdr = Number(chequeForDdFdrResult?.count || 0);

        // Count rejected
        const rejectedConditions = [
            ...baseConditions,
            eq(paymentInstruments.status, 'Rejected'),
            ne(paymentInstruments.action, 6),
            excludeExpiredCondition,
        ];
        const [rejectedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...rejectedConditions));
        const rejected = Number(rejectedResult?.count || 0);

        // Count cancelled
        const cancelledConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 6),
            ne(paymentInstruments.status, 'Rejected'),
            excludeExpiredCondition,
        ];
        const [cancelledResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...cancelledConditions));
        const cancelled = Number(cancelledResult?.count || 0);

        // Count expired
        const expiredConditions = [
            ...baseConditions,
            isNotNull(instrumentChequeDetails.dueDate),
            sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' < CURRENT_DATE`
        ];
        const [expiredResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...expiredConditions));
        const expired = Number(expiredResult?.count || 0);

        return {
            'cheque-pending': chequePending,
            'cheque-payable': chequePayable,
            'cheque-paid-stop': chequePaidStop,
            'cheque-for-security': chequeForSecurity,
            'cheque-for-dd-fdr': chequeForDdFdr,
            rejected,
            cancelled,
            expired,
            total: chequePending + chequePayable + chequePaidStop + chequeForSecurity + chequeForDdFdr + rejected + cancelled + expired,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form-1': 1,
            'accounts-form-2': 2,
            'accounts-form-3': 3,
            'initiate-followup': 4,
            'returned-courier': 5,
            'request-cancellation': 6,
        };
        return actionMap[action] || 1;
    }

    async updateAction(
        instrumentId: number,
        body: any,
        files: Express.Multer.File[],
        user: any,
    ) {
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== 'Cheque') {
            throw new BadRequestException('Instrument is not a Cheque');
        }

        const actionNumber = this.mapActionToNumber(body.action);
        let contacts: any[] = [];
        if (body.contacts) {
            try {
                contacts = typeof body.contacts === 'string' ? JSON.parse(body.contacts) : body.contacts;
            } catch (e) {
                this.logger.warn('Failed to parse contacts', e);
            }
        }

        const filePaths: string[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const relativePath = `bi-dashboard/${file.filename}`;
                filePaths.push(relativePath);
            }
        }

        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        if (body.action === 'accounts-form-1') {
            if (body.cheque_req === 'Accepted') {
                updateData.status = 'ACCOUNTS_FORM_ACCEPTED';
            } else if (body.cheque_req === 'Rejected') {
                updateData.status = 'ACCOUNTS_FORM_REJECTED';
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'accounts-form-2') {
            updateData.status = 'CHEQUE_CREATED';
        } else if (body.action === 'accounts-form-3') {
            updateData.status = 'CHEQUE_DETAILS_CAPTURED';
        } else if (body.action === 'initiate-followup') {
            updateData.status = 'FOLLOWUP_INITIATED';
        } else if (body.action === 'returned-courier') {
            updateData.status = 'RETURNED_VIA_COURIER';
        } else if (body.action === 'request-cancellation') {
            updateData.status = 'CANCELLATION_REQUESTED';
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const chequeDetailsUpdate: any = {};
        if (body.action === 'accounts-form-2') {
            if (body.cheque_no) chequeDetailsUpdate.chequeNo = body.cheque_no;
            if (body.cheque_date) chequeDetailsUpdate.chequeDate = body.cheque_date;
            if (body.cheque_amount) chequeDetailsUpdate.amount = body.cheque_amount;
            if (body.cheque_type) chequeDetailsUpdate.reqType = body.cheque_type;
            if (body.cheque_reason) chequeDetailsUpdate.chequeReason = body.cheque_reason;
            if (body.due_date) chequeDetailsUpdate.dueDate = body.due_date;
        } else if (body.action === 'accounts-form-3') {
            if (filePaths.length > 0) {
                chequeDetailsUpdate.chequeImagePath = filePaths.join(',');
            }
        }

        if (Object.keys(chequeDetailsUpdate).length > 0) {
            chequeDetailsUpdate.updatedAt = new Date();
            await this.db
                .update(instrumentChequeDetails)
                .set(chequeDetailsUpdate)
                .where(eq(instrumentChequeDetails.instrumentId, instrumentId));
        }

        if (body.action === 'initiate-followup' && contacts.length > 0) {
            this.logger.log(`Follow-up should be created for instrument ${instrumentId}`);
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }
}
