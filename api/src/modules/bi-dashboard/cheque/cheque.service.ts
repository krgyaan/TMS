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
import { CHEQUE_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';

@Injectable()
export class ChequeService {
    private readonly logger = new Logger(ChequeService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    private statusMap() {
        return {
            [CHEQUE_STATUSES.PENDING]: 'Pending',
            [CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [CHEQUE_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [CHEQUE_STATUSES.STOP_REQUESTED]: 'Stop Requested',
            [CHEQUE_STATUSES.DEPOSITED_IN_BANK]: 'Deposited',
            [CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER]: 'Paid via BT',
            [CHEQUE_STATUSES.CANCELLED_TORN]: 'Cancelled/Torn',
        };
    }

    private getNotExpiredCondition() {
        return or(
            isNull(instrumentChequeDetails.dueDate),
            sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' >= CURRENT_DATE`
        );
    }

    private getExpiredConditionSQL() {
        return and(
            isNotNull(instrumentChequeDetails.dueDate),
            sql`${instrumentChequeDetails.dueDate} + INTERVAL '3 months' < CURRENT_DATE`
        );
    }

    private buildChequeDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'Cheque'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'cheque-pending') {
            conditions.push(
                eq(paymentInstruments.action, 0),
                eq(paymentInstruments.status, CHEQUE_STATUSES.PENDING),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-payable') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                eq(paymentInstruments.action, 1),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                eq(instrumentChequeDetails.chequeReason, 'Payable'),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-paid-stop') {
            conditions.push(
                inArray(paymentInstruments.action, [3, 4, 5]),
                ne(paymentInstruments.action, 6), // not cancelled
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-for-security') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                eq(instrumentChequeDetails.chequeReason, 'Security'),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cheque-for-dd-fdr') {
            conditions.push(
                ne(paymentInstruments.action, 6), // not cancelled
                inArray(instrumentChequeDetails.chequeReason, ['DD', 'FDR', 'EMD']),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'rejected') {
            conditions.push(
                eq(paymentInstruments.action, 1),
                eq(paymentInstruments.status, CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'cancelled') {
            conditions.push(
                inArray(paymentInstruments.action, [6, 7]),
                this.getNotExpiredCondition(),
            );
        } else if (tab === 'expired') {
            conditions.push(
                this.getExpiredConditionSQL()
            );
        }

        return conditions;
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

        const conditions = this.buildChequeDashboardConditions(tab);

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
                chequeNo: instrumentChequeDetails.chequeNo,
                payeeName: paymentInstruments.favouring,
                bidValidity: tenderInfos.dueDate,
                amount: paymentInstruments.amount,
                type: instrumentChequeDetails.chequeReason,
                cheque: instrumentChequeDetails.chequeDate,
                dueDate: instrumentChequeDetails.dueDate,
                chequeStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Count query for pagination
        // Using same joins to ensure Search works on Tender Name etc
        const [countResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        function isExpired(dueDate: Date): boolean {
            return dueDate && new Date(dueDate.getTime() + 3 * 30 * 24 * 60 * 60 * 1000) < new Date(Date.now());
        }

        const data: ChequeDashboardRow[] = rows.map((row) => ({
            id: row.id,
            chequeNo: row.chequeNo,
            payeeName: row.payeeName,
            bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
            amount: row.amount ? Number(row.amount) : null,
            type: row.type,
            cheque: row.cheque,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            expiry: row.dueDate ? (isExpired(new Date(row.dueDate)) ? 'Expired' : 'Valid') : null,
            chequeStatus: this.statusMap()[row.chequeStatus],
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countChequeByConditions(conditions: any[]) {
        // FIXED: Added Left Join to instrumentChequeDetails
        // Without this, filters like 'eq(instrumentChequeDetails.chequeReason, ...)' would fail
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentChequeDetails, eq(instrumentChequeDetails.instrumentId, paymentInstruments.id))
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<ChequeDashboardCounts> {
        // Run these in parallel for better performance
        const [
            chequePending,
            chequePayable,
            chequePaidStop,
            chequeForSecurity,
            chequeForDdFdr,
            rejected,
            cancelled,
            expired
        ] = await Promise.all([
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-pending')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-payable')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-paid-stop')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-for-security')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cheque-for-dd-fdr')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('rejected')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('cancelled')),
            this.countChequeByConditions(this.buildChequeDashboardConditions('expired'))
        ]);

        return {
            'cheque-pending': chequePending,
            'cheque-payable': chequePayable,
            'cheque-paid-stop': chequePaidStop,
            'cheque-for-security': chequeForSecurity,
            'cheque-for-dd-fdr': chequeForDdFdr,
            rejected,
            cancelled,
            expired,
            total: chequePending + chequePayable + chequePaidStop +
                chequeForSecurity + chequeForDdFdr + rejected + cancelled + expired,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form': 1,
            'initiate-followup': 2,
            'stop-cheque': 3,
            'paid-via-bank-transfer': 4,
            'deposited-in-bank': 5,
            'cancelled-torn': 6,
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
                updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.cheque_req === 'Rejected') {
                updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'accounts-form-2') {
            updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === 'accounts-form-3') {
            updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === 'initiate-followup') {
            updateData.status = CHEQUE_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'stop-cheque') {
            updateData.status = CHEQUE_STATUSES.STOP_REQUESTED;
        } else if (body.action === 'paid-via-bank-transfer') {
            updateData.status = CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER;
            if (body.transfer_date) updateData.transferDate = body.transfer_date;
            if (body.utr) updateData.utr = body.utr;
        } else if (body.action === 'deposited-in-bank') {
            updateData.status = CHEQUE_STATUSES.DEPOSITED_IN_BANK;
        } else if (body.action === 'cancelled-torn') {
            updateData.status = CHEQUE_STATUSES.CANCELLED_TORN;
        } else if (body.action === 'returned-courier') {
            updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED; // Use appropriate status
            if (filePaths.length > 0) {
                updateData.docketSlip = filePaths[0];
            }
        } else if (body.action === 'request-cancellation') {
            updateData.status = CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED; // Use appropriate status
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
            if (filePaths.length > 0 && body.cheque_images) {
                const chequeImageIndexes = filePaths
                    .map((path, idx) => body.cheque_images && path.includes('cheque_images') ? idx : -1)
                    .filter(idx => idx >= 0);
                if (chequeImageIndexes.length > 0) {
                    chequeDetailsUpdate.chequeImagePath = chequeImageIndexes.map(idx => filePaths[idx]).join(',');
                }
            }
        } else if (body.action === 'stop-cheque') {
            if (body.stop_reason_text) chequeDetailsUpdate.stopReasonText = body.stop_reason_text;
        } else if (body.action === 'paid-via-bank-transfer') {
            if (body.transfer_date) chequeDetailsUpdate.transferDate = body.transfer_date;
            if (body.utr) chequeDetailsUpdate.reference = body.utr;
            if (body.amount) chequeDetailsUpdate.amount = body.amount;
        } else if (body.action === 'deposited-in-bank') {
            if (body.bt_transfer_date) chequeDetailsUpdate.btTransferDate = body.bt_transfer_date;
            if (body.reference) chequeDetailsUpdate.reference = body.reference;
        } else if (body.action === 'cancelled-torn') {
            if (filePaths.length > 0 && body.cancelled_image_path) {
                const cancelledImageIndex = filePaths.findIndex((path: string) => path.includes('cancelled') || body.cancelled_image_path);
                if (cancelledImageIndex >= 0) {
                    chequeDetailsUpdate.cancelledImagePath = filePaths[cancelledImageIndex];
                }
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
