import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, inArray, isNull, sql, asc, desc, like } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentFdrDetails,
    instrumentBgDetails,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { FdrDashboardRow, FdrDashboardCounts } from '@/modules/bi-dashboard/fdr/helpers/fdr.types';
import { FDR_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FdrService {
    private readonly logger = new Logger(FdrService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
    ) { }

    async getDashboardData(
        tab?: string,
        options?: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            search?: string;
        },
    ): Promise<PaginatedResult<FdrDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'FDR'),
            eq(paymentInstruments.isActive, true),
        ];

        // Apply tab-specific filters
        if (tab === 'pending') {
            conditions.push(isNull(paymentInstruments.action));
        } else if (tab === 'created') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED)
            );
        } else if (tab === 'rejected') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2]),
                eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_REJECTED)
            );
        } else if (tab === 'returned') {
            conditions.push(inArray(paymentInstruments.action, [3, 4, 5]));
        } else if (tab === 'cancelled') {
            conditions.push(inArray(paymentInstruments.action, [6, 7]));
        } else if (tab === 'pnb-bg-linked') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
                like(instrumentFdrDetails.fdrSource, 'BG_%'),
                sql`EXISTS (
                    SELECT 1 FROM instrument_bg_details bg
                    INNER JOIN payment_instruments bg_instrument ON bg.instrument_id = bg_instrument.id
                    WHERE bg_instrument.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                    AND bg.bank_name = 'PNB_6011'
                )`
            );
        } else if (tab === 'ybl-bg-linked') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
                like(instrumentFdrDetails.fdrSource, 'BG_%'),
                sql`EXISTS (
                    SELECT 1 FROM instrument_bg_details bg
                    INNER JOIN payment_instruments bg_instrument ON bg.instrument_id = bg_instrument.id
                    WHERE bg_instrument.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                    AND bg.bank_name IN ('YESBANK_2011', 'YESBANK_0771', 'BGLIMIT_0771')
                )`
            );
        } else if (tab === 'security-deposit') {
            conditions.push(
                inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
                eq(instrumentFdrDetails.fdrPurpose, 'deposit')
            );
        } else if (tab === 'bond-linked') {
            conditions.push(eq(paymentInstruments.action, 8));
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${tenderInfos.tenderName} ILIKE ${searchStr} OR
                    ${tenderInfos.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentFdrDetails.fdrNo} ILIKE ${searchStr} OR
                    ${instrumentFdrDetails.fdrSource} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build order clause
        let orderClause: any = desc(paymentInstruments.createdAt);
        if (options?.sortBy) {
            const direction = options.sortOrder === 'desc' ? desc : asc;
            switch (options.sortBy) {
                case 'fdrCreationDate':
                    orderClause = direction(instrumentFdrDetails.fdrDate);
                    break;
                case 'fdrNo':
                    orderClause = direction(instrumentFdrDetails.fdrNo);
                    break;
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'fdrAmount':
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
                fdrCreationDate: instrumentFdrDetails.fdrDate,
                fdrNo: instrumentFdrDetails.fdrNo,
                beneficiaryName: sql<string | null>`NULL`, // FDR doesn't have beneficiaryName in schema
                fdrAmount: paymentInstruments.amount,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                tenderStatus: statuses.name,
                member: users.name,
                expiry: instrumentFdrDetails.fdrExpiryDate,
                fdrStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .innerJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
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
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        const data: FdrDashboardRow[] = rows.map((row) => ({
            id: row.id,
            fdrCreationDate: row.fdrCreationDate ? new Date(row.fdrCreationDate) : null,
            fdrNo: row.fdrNo,
            beneficiaryName: row.beneficiaryName,
            fdrAmount: row.fdrAmount ? Number(row.fdrAmount) : null,
            tenderName: row.tenderName,
            tenderNo: row.tenderNo,
            tenderStatus: row.tenderStatus,
            member: row.member,
            expiry: row.expiry ? new Date(row.expiry) : null,
            fdrStatus: row.fdrStatus,
        }));

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getDashboardCounts(): Promise<FdrDashboardCounts> {
        const baseConditions = [
            eq(paymentInstruments.instrumentType, 'FDR'),
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

        // Count created
        const createdConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED),
        ];
        const [createdResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...createdConditions));
        const created = Number(createdResult?.count || 0);

        // Count rejected
        const rejectedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, FDR_STATUSES.ACCOUNTS_FORM_REJECTED),
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
            inArray(paymentInstruments.action, [3, 4, 5]),
        ];
        const [returnedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...returnedConditions));
        const returned = Number(returnedResult?.count || 0);

        // Count cancelled
        const cancelledConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [6, 7]),
        ];
        const [cancelledResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...cancelledConditions));
        const cancelled = Number(cancelledResult?.count || 0);

        // Count pnb-bg-linked
        const pnbBgLinkedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
            like(instrumentFdrDetails.fdrSource, 'BG_%'),
            sql`EXISTS (
                SELECT 1 FROM instrument_bg_details bg
                INNER JOIN payment_instruments bg_instrument ON bg.instrument_id = bg_instrument.id
                WHERE bg_instrument.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                AND bg.bank_name = 'PNB_6011'
            )`
        ];
        const [pnbBgLinkedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .where(and(...pnbBgLinkedConditions));
        const pnbBgLinked = Number(pnbBgLinkedResult?.count || 0);

        // Count ybl-bg-linked
        const yblBgLinkedConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
            like(instrumentFdrDetails.fdrSource, 'BG_%'),
            sql`EXISTS (
                SELECT 1 FROM instrument_bg_details bg
                INNER JOIN payment_instruments bg_instrument ON bg.instrument_id = bg_instrument.id
                WHERE bg_instrument.id = CAST(SUBSTRING(${instrumentFdrDetails.fdrSource} FROM 4) AS INTEGER)
                AND bg.bank_name IN ('YESBANK_2011', 'YESBANK_0771', 'BGLIMIT_0771')
            )`
        ];
        const [yblBgLinkedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .where(and(...yblBgLinkedConditions));
        const yblBgLinked = Number(yblBgLinkedResult?.count || 0);

        // Count security-deposit
        const securityDepositConditions = [
            ...baseConditions,
            inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7]),
            eq(instrumentFdrDetails.fdrPurpose, 'deposit'),
        ];
        const [securityDepositResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentFdrDetails, eq(instrumentFdrDetails.instrumentId, paymentInstruments.id))
            .where(and(...securityDepositConditions));
        const securityDeposit = Number(securityDepositResult?.count || 0);

        // Count bond-linked
        const bondLinkedConditions = [
            ...baseConditions,
            eq(paymentInstruments.action, 8),
        ];
        const [bondLinkedResult] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .where(and(...bondLinkedConditions));
        const bondLinked = Number(bondLinkedResult?.count || 0);

        return {
            pending,
            'pnb-bg-linked': pnbBgLinked,
            'ybl-bg-linked': yblBgLinked,
            'security-deposit': securityDeposit,
            'bond-linked': bondLinked,
            rejected,
            returned,
            cancelled,
            total: pending + created + rejected + returned + cancelled + pnbBgLinked + yblBgLinked + securityDeposit + bondLinked,
        };
    }

    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form': 1,
            'accounts-form-1': 1,
            'accounts-form-2': 1,
            'accounts-form-3': 1,
            'initiate-followup': 2,
            'returned-courier': 3,
            'returned-bank-transfer': 4,
            'settled-with-project': 5,
            'request-cancellation': 6,
            'cancelled-at-branch': 7,
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

        if (instrument.instrumentType !== 'FDR') {
            throw new BadRequestException('Instrument is not an FDR');
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

        if (body.action === 'accounts-form' || body.action === 'accounts-form-1') {
            if (body.fdr_req === 'Accepted') {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
            } else if (body.fdr_req === 'Rejected') {
                updateData.status = FDR_STATUSES.ACCOUNTS_FORM_REJECTED;
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'accounts-form-2') {
            updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === 'accounts-form-3') {
            updateData.status = FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED;
        } else if (body.action === 'initiate-followup') {
            updateData.status = FDR_STATUSES.FOLLOWUP_INITIATED;
        } else if (body.action === 'returned-courier') {
            updateData.status = FDR_STATUSES.COURIER_RETURN_RECEIVED;
            if (filePaths.length > 0) {
                updateData.docketSlip = filePaths[0];
            }
        } else if (body.action === 'returned-bank-transfer') {
            updateData.status = FDR_STATUSES.BANK_RETURN_COMPLETED;
        } else if (body.action === 'settled-with-project') {
            updateData.status = FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED;
        } else if (body.action === 'request-cancellation') {
            updateData.status = FDR_STATUSES.CANCELLATION_REQUESTED;
            // Handle covering letter file
            if (filePaths.length > 0 && body.covering_letter) {
                const coveringLetterIndex = filePaths.findIndex((path: string) => path.includes('covering') || body.covering_letter);
                if (coveringLetterIndex >= 0) {
                    updateData.coveringLetter = filePaths[coveringLetterIndex];
                }
            }
            // Handle req_receive file
            if (filePaths.length > 0 && body.req_receive) {
                const reqReceiveIndex = filePaths.findIndex((path: string) => path.includes('req_receive') || body.req_receive);
                if (reqReceiveIndex >= 0) {
                    updateData.reqReceive = filePaths[reqReceiveIndex];
                }
            }
        } else if (body.action === 'cancelled-at-branch') {
            updateData.status = FDR_STATUSES.CANCELLED_AT_BRANCH;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        const fdrDetailsUpdate: any = {};
        if (body.action === 'accounts-form' || body.action === 'accounts-form-1') {
            if (body.fdr_no) fdrDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_date) fdrDetailsUpdate.fdrDate = body.fdr_date;
            if (body.fdr_validity) fdrDetailsUpdate.fdrExpiryDate = body.fdr_validity;
            if (body.fdr_percentage) fdrDetailsUpdate.marginPercent = body.fdr_percentage;
            if (body.fdr_amount) fdrDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_roi) fdrDetailsUpdate.roi = body.fdr_roi;
        } else if (body.action === 'accounts-form-2') {
            if (body.fdr_no) fdrDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_date) fdrDetailsUpdate.fdrDate = body.fdr_date;
            if (body.fdr_validity) fdrDetailsUpdate.fdrExpiryDate = body.fdr_validity;
            if (body.req_no) fdrDetailsUpdate.reqNo = body.req_no;
            if (body.remarks) fdrDetailsUpdate.fdrRemark = body.remarks;
        } else if (body.action === 'accounts-form-3') {
            if (body.fdr_percentage) fdrDetailsUpdate.marginPercent = body.fdr_percentage;
            if (body.fdr_amount) fdrDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_roi) fdrDetailsUpdate.roi = body.fdr_roi;
            // Handle sfms_confirmation file if provided
            if (filePaths.length > 0 && body.sfms_confirmation) {
                const sfmsConfIndex = filePaths.findIndex((path: string) => path.includes('sfms') || body.sfms_confirmation);
                if (sfmsConfIndex >= 0) {
                    // Store in a way that makes sense - might need to check schema
                }
            }
        }

        if (Object.keys(fdrDetailsUpdate).length > 0) {
            fdrDetailsUpdate.updatedAt = new Date();
            await this.db
                .update(instrumentFdrDetails)
                .set(fdrDetailsUpdate)
                .where(eq(instrumentFdrDetails.instrumentId, instrumentId));
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
