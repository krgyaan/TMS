import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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
import * as fs from 'fs';
import * as path from 'path';

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
                bgClaimPeriod: sql<number | null>`CASE WHEN ${instrumentBgDetails.claimExpiryDate} IS NOT NULL AND ${instrumentBgDetails.validityDate} IS NOT NULL THEN (${instrumentBgDetails.claimExpiryDate} - ${instrumentBgDetails.validityDate}) ELSE NULL END`,
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

    /**
     * Map action string to action number
     */
    private mapActionToNumber(action: string): number {
        const actionMap: Record<string, number> = {
            'accounts-form-1': 1,
            'accounts-form-2': 2,
            'accounts-form-3': 3,
            'initiate-followup': 4,
            'request-extension': 5,
            'returned-courier': 6,
            'request-cancellation': 7,
            'bg-cancellation-confirmation': 8,
            'fdr-cancellation-confirmation': 9,
        };
        return actionMap[action] || 1;
    }

    /**
     * Update instrument action with form data
     */
    async updateAction(
        instrumentId: number,
        body: any,
        files: Express.Multer.File[],
        user: any,
    ) {
        // Get instrument
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentId))
            .limit(1);

        if (!instrument) {
            throw new NotFoundException(`Instrument ${instrumentId} not found`);
        }

        if (instrument.instrumentType !== 'BG') {
            throw new BadRequestException('Instrument is not a Bank Guarantee');
        }

        // Map action string to number
        const actionNumber = this.mapActionToNumber(body.action);

        // Parse contacts if provided
        let contacts: any[] = [];
        if (body.contacts) {
            try {
                contacts = typeof body.contacts === 'string' ? JSON.parse(body.contacts) : body.contacts;
            } catch (e) {
                this.logger.warn('Failed to parse contacts', e);
            }
        }

        // Handle file paths
        const filePaths: string[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const relativePath = `bi-dashboard/${file.filename}`;
                filePaths.push(relativePath);
            }
        }

        // Update payment_instruments
        const updateData: any = {
            action: actionNumber,
            updatedAt: new Date(),
        };

        // Update status based on action
        if (body.action === 'accounts-form-1') {
            if (body.bg_req === 'Accepted') {
                updateData.status = 'ACCOUNTS_FORM_ACCEPTED';
            } else if (body.bg_req === 'Rejected') {
                updateData.status = 'ACCOUNTS_FORM_REJECTED';
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'accounts-form-2') {
            updateData.status = 'BG_CREATED';
        } else if (body.action === 'accounts-form-3') {
            updateData.status = 'FDR_DETAILS_CAPTURED';
        } else if (body.action === 'initiate-followup') {
            updateData.status = 'FOLLOWUP_INITIATED';
        } else if (body.action === 'request-extension') {
            updateData.status = 'EXTENSION_REQUESTED';
        } else if (body.action === 'returned-courier') {
            updateData.status = 'RETURNED_VIA_COURIER';
            if (filePaths.length > 0) {
                updateData.docketSlip = filePaths[0];
            }
        } else if (body.action === 'request-cancellation') {
            updateData.status = 'CANCELLATION_REQUESTED';
            if (filePaths.length > 0) {
                updateData.coveringLetter = filePaths[0];
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            updateData.status = 'BG_CANCELLED';
            if (filePaths.length > 0) {
                updateData.cancelPdf = filePaths[0];
            }
        } else if (body.action === 'fdr-cancellation-confirmation') {
            updateData.status = 'FDR_CANCELLED';
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Update instrument_bg_details
        const bgDetailsUpdate: any = {};

        if (body.action === 'accounts-form-1') {
            if (body.prefilled_signed_bg && filePaths.length > 0) {
                bgDetailsUpdate.prefilledSignedBg = JSON.stringify(filePaths);
            }
        } else if (body.action === 'accounts-form-2') {
            if (body.bg_no) bgDetailsUpdate.bgNo = body.bg_no;
            if (body.bg_date) bgDetailsUpdate.bgDate = body.bg_date;
            if (body.bg_validity) bgDetailsUpdate.validityDate = body.bg_validity;
            if (body.bg_claim_period) bgDetailsUpdate.claimExpiryDate = body.bg_claim_period;
        } else if (body.action === 'accounts-form-3') {
            if (body.fdr_no) bgDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_amount) bgDetailsUpdate.fdrAmt = body.fdr_amount;
            if (body.fdr_validity) bgDetailsUpdate.fdrValidityDate = body.fdr_validity;
            if (body.fdr_roi) bgDetailsUpdate.fdrRoi = body.fdr_roi;
            if (body.bg_charges) bgDetailsUpdate.stampCharges = body.bg_charges;
            if (body.sfms_charges) bgDetailsUpdate.sfmsCharges = body.sfms_charges;
            if (body.stamp_charges) bgDetailsUpdate.stampCharges = body.stamp_charges;
            if (body.other_charges) bgDetailsUpdate.otherChargesDeducted = body.other_charges;
        } else if (body.action === 'request-extension') {
            if (body.modification_fields) {
                const modFields = typeof body.modification_fields === 'string'
                    ? JSON.parse(body.modification_fields)
                    : body.modification_fields;
                // Store modification fields in extended fields
                if (modFields && modFields.length > 0) {
                    const amountField = modFields.find((f: any) => f.field_name === 'amount');
                    const validityField = modFields.find((f: any) => f.field_name === 'validity');
                    if (amountField) bgDetailsUpdate.extendedAmount = amountField.new_value;
                    if (validityField) bgDetailsUpdate.extendedValidityDate = validityField.new_value;
                }
            }
            if (filePaths.length > 0) {
                bgDetailsUpdate.extensionLetterPath = filePaths[0];
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            if (filePaths.length > 0) {
                bgDetailsUpdate.cancellationLetterPath = filePaths[0];
            }
        }

        if (Object.keys(bgDetailsUpdate).length > 0) {
            bgDetailsUpdate.updatedAt = new Date();
            await this.db
                .update(instrumentBgDetails)
                .set(bgDetailsUpdate)
                .where(eq(instrumentBgDetails.instrumentId, instrumentId));
        }

        // Create follow-up if action is initiate-followup
        if (body.action === 'initiate-followup' && contacts.length > 0) {
            // Get payment request to get tender info
            const [paymentRequest] = await this.db
                .select()
                .from(paymentRequests)
                .where(eq(paymentRequests.id, instrument.requestId))
                .limit(1);

            if (paymentRequest) {
                const [tenderInfo] = await this.db
                    .select()
                    .from(tenderInfos)
                    .where(eq(tenderInfos.id, paymentRequest.tenderId))
                    .limit(1);

                if (tenderInfo) {
                    // Import follow-up service or create follow-up directly
                    // For now, we'll just log it - follow-up creation can be added later
                    this.logger.log(`Follow-up should be created for instrument ${instrumentId}`);
                }
            }
        }

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }
}
