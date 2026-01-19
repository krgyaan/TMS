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
import { statuses } from '@db/schemas/master/statuses.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { BankGuaranteeDashboardRow, BankGuaranteeDashboardCounts } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import { BG_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';

@Injectable()
export class BankGuaranteeService {
    private readonly logger = new Logger(BankGuaranteeService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
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
                eq(paymentInstruments.status, BG_STATUSES.BANK_REQUEST_ACCEPTED)
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
                or(
                    eq(paymentInstruments.action, 1),
                    eq(paymentInstruments.status, BG_STATUSES.BANK_REQUEST_REJECTED)
                )
            );
        }

        // Search filter
        if (options?.search) {
            const searchStr = `%${options.search}%`;
            conditions.push(
                sql`(
                    ${paymentRequests.projectName} ILIKE ${searchStr} OR
                    ${paymentRequests.tenderNo} ILIKE ${searchStr} OR
                    ${instrumentBgDetails.bgNo} ILIKE ${searchStr} OR
                    ${instrumentBgDetails.beneficiaryName} ILIKE ${searchStr}
                )`
            );
        }

        const whereClause = and(...conditions);

        // Build order clause - default to validityDate desc, fallback to createdAt
        let orderClause: any = sql`${instrumentBgDetails.validityDate} DESC NULLS LAST, ${paymentInstruments.createdAt} DESC`;
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
                    orderClause = direction(paymentRequests.tenderNo);
                    break;
                case 'amount':
                    orderClause = direction(paymentInstruments.amount);
                    break;
                default:
                    orderClause = sql`${instrumentBgDetails.validityDate} DESC NULLS LAST, ${paymentInstruments.createdAt} DESC`;
            }
        }

        // Data query - fetch raw column data only
        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                bgDate: instrumentBgDetails.bgDate,
                bgNo: instrumentBgDetails.bgNo,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                // Get tender info from payment_requests table
                tenderName: paymentRequests.projectName,
                tenderNo: paymentRequests.tenderNo,
                bidValidity: paymentRequests.dueDate,
                tenderId: paymentRequests.tenderId,
                tenderType: paymentRequests.type,
                amount: paymentInstruments.amount,
                bgExpiryDate: instrumentBgDetails.validityDate,
                claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                // Raw charge fields for calculation
                stampCharges: instrumentBgDetails.stampCharges,
                sfmsCharges: instrumentBgDetails.sfmsCharges,
                stampChargesDeducted: instrumentBgDetails.stampChargesDeducted,
                sfmsChargesDeducted: instrumentBgDetails.sfmsChargesDeducted,
                otherChargesDeducted: instrumentBgDetails.otherChargesDeducted,
                bgChargeDeducted: instrumentBgDetails.bgChargeDeducted,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrValue: instrumentBgDetails.fdrAmt,
                // Conditional tender status from tenderInfos if tender_id != 0
                tenderStatusFromTender: statuses.name,
                bgStatus: paymentInstruments.status,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, and(
                eq(tenderInfos.id, paymentRequests.tenderId),
                ne(paymentRequests.tenderId, 0)
            ))
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
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(whereClause);

        const total = Number(countResult?.count || 0);

        // Map rows and apply calculations using helper functions
        const data: BankGuaranteeDashboardRow[] = rows.map((row) => {
            const bgDate = row.bgDate ? new Date(row.bgDate) : null;
            const bgExpiryDate = row.bgExpiryDate ? new Date(row.bgExpiryDate) : null;
            const claimExpiryDate = row.claimExpiryDate ? new Date(row.claimExpiryDate) : null;
            const amount = row.amount ? Number(row.amount) : null;

            return {
                id: row.id,
                bgDate,
                bgNo: row.bgNo,
                beneficiaryName: row.beneficiaryName,
                tenderName: row.tenderName,
                tenderNo: row.tenderNo,
                bidValidity: row.bidValidity ? new Date(row.bidValidity) : null,
                amount,
                bgExpiryDate,
                bgClaimPeriod: this.calculateBgClaimPeriod(bgExpiryDate, claimExpiryDate),
                expiryDate: claimExpiryDate,
                bgChargesPaid: this.calculateBgChargesPaid(
                    row.bgChargeDeducted ? Number(row.bgChargeDeducted) : null,
                    row.stampChargesDeducted ? Number(row.stampChargesDeducted) : null,
                    row.sfmsChargesDeducted ? Number(row.sfmsChargesDeducted) : null,
                    row.otherChargesDeducted ? Number(row.otherChargesDeducted) : null
                ),
                bgChargesCalculated: this.calculateBgChargesCalculated(
                    amount,
                    bgDate,
                    claimExpiryDate,
                    row.stampCharges ? Number(row.stampCharges) : null,
                    row.sfmsCharges ? Number(row.sfmsCharges) : null
                ),
                fdrNo: row.fdrNo,
                fdrValue: row.fdrValue ? Number(row.fdrValue) : null,
                tenderStatus: row.tenderId && row.tenderId !== 0 ? row.tenderStatusFromTender : row.tenderType,
                expiry: bgExpiryDate,
                expiryStatus: this.calculateExpiryStatus(bgExpiryDate, claimExpiryDate),
                bgStatus: row.bgStatus,
            };
        });

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
            eq(paymentInstruments.status, BG_STATUSES.BANK_REQUEST_ACCEPTED),
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
            eq(paymentInstruments.status, BG_STATUSES.BANK_REQUEST_REJECTED),
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

    async getDashboardCardStats(): Promise<{
        bankStats: Record<string, {
            count: number;
            percentage: number;
            amount: number;
            fdrAmount10: number;
            fdrAmount15: number;
            fdrAmount100: number;
        }>;
        totalBgCount: number;
        totalBgAmount: number;
    }> {
        const conditions = [
            eq(paymentInstruments.instrumentType, 'BG'),
            eq(paymentInstruments.isActive, true),
            inArray(paymentInstruments.action, [1, 2, 3, 4, 5, 6, 7])
        ];

        const rows = await this.db
            .select({
                bankName: instrumentBgDetails.bankName,
                bgNo: instrumentBgDetails.bgNo,
                amount: paymentInstruments.amount,
                fdrPer: instrumentBgDetails.fdrPer,
                fdrAmt: instrumentBgDetails.fdrAmt,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(...conditions));

        // Group by bank name
        const groupedByBank: Record<string, typeof rows> = {};
        for (const row of rows) {
            const bankName = row.bankName || 'UNKNOWN';
            if (!groupedByBank[bankName]) {
                groupedByBank[bankName] = [];
            }
            groupedByBank[bankName].push(row);
        }

        // Calculate totals
        const totalBgCount = rows.length;
        const totalBgAmount = rows.reduce((sum, row) => sum + (row.amount ? Number(row.amount) : 0), 0);

        // Calculate stats for each bank
        const bankStats: Record<string, {
            count: number;
            percentage: number;
            amount: number;
            fdrAmount10: number;
            fdrAmount15: number;
            fdrAmount100: number;
        }> = {};

        for (const [bankName, bgs] of Object.entries(groupedByBank)) {
            // Count BGs with bg_no not null
            const bankCount = bgs.filter(bg => bg.bgNo !== null && bg.bgNo !== '').length;

            // Sum of bg_amt where bg_no is not null
            const bankAmount = bgs
                .filter(bg => bg.bgNo !== null && bg.bgNo !== '')
                .reduce((sum, bg) => sum + (bg.amount ? Number(bg.amount) : 0), 0);

            // FDR amounts by percentage
            const fdrAmount10 = bgs
                .filter(bg => bg.bgNo !== null && bg.bgNo !== '' && bg.fdrPer && Number(bg.fdrPer) === 10)
                .reduce((sum, bg) => sum + (bg.fdrAmt ? Number(bg.fdrAmt) : 0), 0);

            const fdrAmount15 = bgs
                .filter(bg => bg.bgNo !== null && bg.bgNo !== '' && bg.fdrPer && Number(bg.fdrPer) === 15)
                .reduce((sum, bg) => sum + (bg.fdrAmt ? Number(bg.fdrAmt) : 0), 0);

            const fdrAmount100 = bgs
                .filter(bg => bg.bgNo !== null && bg.bgNo !== '' && bg.fdrPer && Number(bg.fdrPer) === 100)
                .reduce((sum, bg) => sum + (bg.fdrAmt ? Number(bg.fdrAmt) : 0), 0);

            const percentage = totalBgCount > 0 ? (bankCount / totalBgCount) * 100 : 0;

            bankStats[bankName] = {
                count: bankCount,
                percentage,
                amount: bankAmount,
                fdrAmount10,
                fdrAmount15,
                fdrAmount100,
            };
        }

        return {
            bankStats,
            totalBgCount,
            totalBgAmount,
        };
    }

    /**
     * Calculate BG charges calculated with interest
     * Formula: stamp paper (300) + SFMS (590) + interest component
     * Interest: bgValue * (0.01/365) * monthsDifference * 1.18 (GST)
     * Note: Laravel uses diffInMonths which returns integer months, then multiplies by daily rate
     */
    private calculateBgChargesCalculated(
        bgValue: number | null,
        bgDate: Date | null,
        claimExpiryDate: Date | null,
        stampCharges: number | null,
        sfmsCharges: number | null
    ): number | null {
        if (!bgValue || !bgDate || !claimExpiryDate) {
            return null;
        }

        const bgStampPaperValue = stampCharges ?? 300;
        const sfmsChargesValue = sfmsCharges ?? 590;

        // Calculate months difference (integer months, matching Laravel's diffInMonths)
        const monthsDifference = this.calculateMonthsDifference(bgDate, claimExpiryDate);

        // Daily interest rate: 0.01 / 365
        const dailyInterestRate = 0.01 / 365;

        // Interest component (matching Laravel: bgValue * dailyRate * months)
        const interestComponent = bgValue * dailyInterestRate * monthsDifference;

        // Add GST (1.18)
        const interestWithGST = interestComponent * 1.18;

        return bgStampPaperValue + sfmsChargesValue + interestWithGST;
    }

    /**
     * Calculate BG charges paid (sum of all deducted charges)
     */
    private calculateBgChargesPaid(
        bgChargeDeducted: number | null,
        stampChargesDeducted: number | null,
        sfmsChargesDeducted: number | null,
        otherChargesDeducted: number | null
    ): number | null {
        const total = (bgChargeDeducted ?? 0) +
            (stampChargesDeducted ?? 0) +
            (sfmsChargesDeducted ?? 0) +
            (otherChargesDeducted ?? 0);

        return total > 0 ? total : null;
    }

    /**
     * Calculate expiry status based on current date
     * Returns: "Valid", "Claim Period", "Expired", or "N/A"
     */
    private calculateExpiryStatus(
        bgExpiryDate: Date | null,
        claimExpiryDate: Date | null
    ): string | null {
        if (!bgExpiryDate || !claimExpiryDate) {
            return 'N/A';
        }

        const now = new Date();
        const bgExpiry = new Date(bgExpiryDate);
        const claimExpiry = new Date(claimExpiryDate);

        if (now <= bgExpiry) {
            return 'Valid';
        } else if (now <= claimExpiry) {
            return 'Claim Period';
        } else {
            return 'Expired';
        }
    }

    /**
     * Calculate BG claim period in days
     */
    private calculateBgClaimPeriod(
        validityDate: Date | null,
        claimExpiryDate: Date | null
    ): number | null {
        if (!validityDate || !claimExpiryDate) {
            return null;
        }

        const validity = new Date(validityDate);
        const claimExpiry = new Date(claimExpiryDate);
        const diffTime = claimExpiry.getTime() - validity.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Calculate months difference between two dates
     * Returns integer months (matching Laravel's diffInMonths behavior)
     */
    private calculateMonthsDifference(startDate: Date, endDate: Date): number {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();

        // Calculate total months (integer, matching Laravel's diffInMonths)
        let totalMonths = yearsDiff * 12 + monthsDiff;

        // Adjust if end day is before start day (same logic as Carbon's diffInMonths)
        if (end.getDate() < start.getDate()) {
            totalMonths--;
        }

        return totalMonths;
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
     * Get single file for a field by checking if body field exists
     * Files are processed in order as they appear in the files array
     */
    private getFileForField(
        fieldname: string,
        files: Express.Multer.File[],
        body: any,
        fileIndexTracker: { current: number }
    ): Express.Multer.File | null {
        // Check if body has this field (indicating a file was uploaded)
        if (body[fieldname] !== undefined && files.length > fileIndexTracker.current) {
            const file = files[fileIndexTracker.current];
            fileIndexTracker.current++;
            return file;
        }
        return null;
    }

    /**
     * Get multiple files for a field (like prefilled_signed_bg)
     * Takes remaining files from current index
     */
    private getMultipleFilesForField(
        fieldname: string,
        files: Express.Multer.File[],
        body: any,
        fileIndexTracker: { current: number }
    ): Express.Multer.File[] {
        if (body[fieldname] !== undefined && files.length > fileIndexTracker.current) {
            // For multiple files, take all remaining files
            // This works because prefilled_signed_bg is typically the last file field in accounts-form-1
            const startIndex = fileIndexTracker.current;
            const extractedFiles = files.slice(startIndex);
            fileIndexTracker.current = files.length;
            return extractedFiles;
        }
        return [];
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

        // Track file index for processing files in order
        const fileIndexTracker = { current: 0 };

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
            const docketSlipFile = this.getFileForField('docket_slip', files, body, fileIndexTracker);
            if (docketSlipFile) {
                updateData.docketSlip = `bi-dashboard/${docketSlipFile.filename}`;
            }
        } else if (body.action === 'request-cancellation') {
            updateData.status = 'CANCELLATION_REQUESTED';
            const coveringLetterFile = this.getFileForField('stamp_covering_letter', files, body, fileIndexTracker);
            if (coveringLetterFile) {
                updateData.coveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            updateData.status = 'BG_CANCELLED';
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            if (cancellConfirmFile) {
                updateData.cancelPdf = `bi-dashboard/${cancellConfirmFile.filename}`;
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
            // Map approve_bg field
            if (body.approve_bg) bgDetailsUpdate.approveBg = body.approve_bg;

            // Map reason_req when rejected
            if (body.bg_req === 'Rejected' && body.reason_req) {
                bgDetailsUpdate.reasonReq = body.reason_req;
            }

            // Handle bg_format_imran file (single file)
            const bgFormatImranFile = this.getFileForField('bg_format_imran', files, body, fileIndexTracker);
            if (bgFormatImranFile) {
                bgDetailsUpdate.bgFormatTe = `bi-dashboard/${bgFormatImranFile.filename}`;
            }

            // Handle prefilled_signed_bg files (multiple files)
            const prefilledFiles = this.getMultipleFilesForField('prefilled_signed_bg', files, body, fileIndexTracker);
            if (prefilledFiles.length > 0) {
                const filePaths = prefilledFiles.map(f => `bi-dashboard/${f.filename}`);
                bgDetailsUpdate.prefilledSignedBg = JSON.stringify(filePaths);
            }
        } else if (body.action === 'accounts-form-2') {
            if (body.bg_no) bgDetailsUpdate.bgNo = body.bg_no;
            if (body.bg_date) bgDetailsUpdate.bgDate = body.bg_date;
            if (body.bg_validity) bgDetailsUpdate.validityDate = body.bg_validity;
            if (body.bg_claim_period) bgDetailsUpdate.claimExpiryDate = body.bg_claim_period;
            if (body.courier_no) bgDetailsUpdate.courierNo = body.courier_no;
            if (body.bg2_remark) bgDetailsUpdate.bg2Remark = body.bg2_remark;
        } else if (body.action === 'accounts-form-3') {
            if (body.fdr_no) bgDetailsUpdate.fdrNo = body.fdr_no;
            if (body.fdr_amt) bgDetailsUpdate.fdrAmt = body.fdr_amt;
            if (body.fdr_per) bgDetailsUpdate.fdrPer = body.fdr_per;
            if (body.fdr_validity) bgDetailsUpdate.fdrValidity = body.fdr_validity;
            if (body.fdr_roi) bgDetailsUpdate.fdrRoi = body.fdr_roi;
            if (body.bg_charge_deducted) bgDetailsUpdate.bgChargeDeducted = body.bg_charge_deducted;
            if (body.sfms_charge_deducted) bgDetailsUpdate.sfmsChargesDeducted = body.sfms_charge_deducted;
            if (body.stamp_charge_deducted) bgDetailsUpdate.stampChargesDeducted = body.stamp_charge_deducted;
            if (body.other_charge_deducted) bgDetailsUpdate.otherChargesDeducted = body.other_charge_deducted;

            // Handle sfms_conf file
            const sfmsConfFile = this.getFileForField('sfms_conf', files, body, fileIndexTracker);
            if (sfmsConfFile) {
                bgDetailsUpdate.sfmsConf = `bi-dashboard/${sfmsConfFile.filename}`;
            }

            // Handle fdr_copy file
            const fdrCopyFile = this.getFileForField('fdr_copy', files, body, fileIndexTracker);
            if (fdrCopyFile) {
                bgDetailsUpdate.fdrCopy = `bi-dashboard/${fdrCopyFile.filename}`;
            }
        } else if (body.action === 'request-extension') {
            // Handle modification fields only if modification_required is 'Yes'
            if (body.modification_required === 'Yes') {
                if (body.new_bg_amt) bgDetailsUpdate.extendedAmount = body.new_bg_amt;
                if (body.new_bg_expiry) bgDetailsUpdate.extendedValidityDate = body.new_bg_expiry;
                if (body.new_bg_claim) bgDetailsUpdate.extendedClaimExpiryDate = body.new_bg_claim;
                if (body.new_bg_bank_name) bgDetailsUpdate.extendedBankName = body.new_bg_bank_name;
                if (body.new_stamp_charge_deducted) bgDetailsUpdate.newStampChargeDeducted = body.new_stamp_charge_deducted;
            }

            // Handle extension letter file
            const extLetterFile = this.getFileForField('ext_letter', files, body, fileIndexTracker);
            if (extLetterFile) {
                bgDetailsUpdate.extensionLetterPath = `bi-dashboard/${extLetterFile.filename}`;
            }
        } else if (body.action === 'returned-courier') {
            if (body.docket_no) bgDetailsUpdate.courierNo = body.docket_no;
            // Note: docket_slip file is already handled in updateData section (paymentInstruments.docketSlip)
        } else if (body.action === 'request-cancellation') {
            if (body.cancel_remark) bgDetailsUpdate.cancelRemark = body.cancel_remark;
            const coveringLetterFile = this.getFileForField('stamp_covering_letter', files, body, fileIndexTracker);
            if (coveringLetterFile) {
                bgDetailsUpdate.stampCoveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            if (cancellConfirmFile) {
                bgDetailsUpdate.cancellConfirm = `bi-dashboard/${cancellConfirmFile.filename}`;
            }
        } else if (body.action === 'fdr-cancellation-confirmation') {
            if (body.bg_fdr_cancel_date) bgDetailsUpdate.bgFdrCancelDate = body.bg_fdr_cancel_date;
            if (body.bg_fdr_cancel_amount) bgDetailsUpdate.bgFdrCancelAmount = body.bg_fdr_cancel_amount;
            if (body.bg_fdr_cancel_ref_no) bgDetailsUpdate.bgFdrCancelRefNo = body.bg_fdr_cancel_ref_no;
        }

        // Ensure bgDetails record exists before updating
        if (Object.keys(bgDetailsUpdate).length > 0) {
            bgDetailsUpdate.updatedAt = new Date();

            // Check if bgDetails record exists
            const [existingBgDetails] = await this.db
                .select()
                .from(instrumentBgDetails)
                .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                .limit(1);

            if (existingBgDetails) {
                await this.db
                    .update(instrumentBgDetails)
                    .set(bgDetailsUpdate)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId));
            } else {
                // Create new bgDetails record
                await this.db.insert(instrumentBgDetails).values({
                    instrumentId,
                    ...bgDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        // Create follow-up if action is initiate-followup
        if (body.action === 'initiate-followup') {
            try {
                // Get payment request and tender info
                const [paymentRequest] = await this.db
                    .select({
                        requestId: paymentRequests.id,
                        tenderId: paymentRequests.tenderId,
                    })
                    .from(paymentRequests)
                    .where(eq(paymentRequests.id, instrument.requestId))
                    .limit(1);

                if (paymentRequest) {
                    const [tenderInfo] = await this.db
                        .select({
                            teamId: tenderInfos.team,
                            teamMemberId: tenderInfos.teamMember,
                        })
                        .from(tenderInfos)
                        .where(eq(tenderInfos.id, paymentRequest.tenderId))
                        .limit(1);

                    if (tenderInfo) {
                        // Get team name
                        const [team] = await this.db
                            .select({ name: teams.name })
                            .from(teams)
                            .where(eq(teams.id, tenderInfo.teamId))
                            .limit(1);

                        // Map team name to area format (AC → 'AC Team', Accounts → 'Accounts', others → '{team} Team')
                        let area = 'DC Team';
                        if (team?.name === 'AC') {
                            area = 'AC Team';
                        } else if (team?.name === 'Accounts') {
                            area = 'Accounts';
                        } else if (team?.name) {
                            area = `${team.name} Team`;
                        }

                        // Identify proof image from files
                        let proofImagePath: string | null = null;
                        const proofImageFile = this.getFileForField('proof_image', files, body, fileIndexTracker);
                        if (proofImageFile) {
                            proofImagePath = proofImageFile.filename;
                        }

                        // Map contacts to ContactPersonDto format and filter out invalid ones
                        const mappedContacts = contacts
                            .filter((contact) => contact.name && contact.name.trim().length > 0)
                            .map((contact) => ({
                                name: contact.name.trim(),
                                email: contact.email || null,
                                phone: contact.phone || null,
                                org: contact.org || null,
                            }));

                        if (mappedContacts.length === 0) {
                            throw new BadRequestException('At least one valid contact with name is required');
                        }

                        // Create followup DTO
                        const followUpDto: CreateFollowUpDto = {
                            area,
                            partyName: body.organisation_name || '',
                            amount: instrument.amount ? Number(instrument.amount) : 0,
                            followupFor: 'Bank Guarantee',
                            assignedToId: tenderInfo.teamMemberId || null,
                            emdId: paymentRequest.requestId,
                            contacts: mappedContacts,
                            frequency: body.frequency ? Number(body.frequency) : 1,
                            startFrom: body.followup_start_date || undefined,
                            stopReason: body.stop_reason ? Number(body.stop_reason) : null,
                            proofText: body.proof_text || null,
                            proofImagePath: proofImagePath,
                            stopRemarks: body.stop_remarks || null,
                            attachments: [],
                            createdById: user.id,
                            followUpHistory: [],
                        };

                        await this.followUpService.create(followUpDto, user.id);
                        this.logger.log(`Follow-up created successfully for instrument ${instrumentId}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to create follow-up for instrument ${instrumentId}:`, error);
                // Don't throw - allow the action to complete even if followup creation fails
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
