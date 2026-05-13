import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, or, inArray, isNull, sql, asc, desc, ne } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentBgDetails,
} from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { users } from '@db/schemas/auth/users.schema';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import type { BankGuaranteeDashboardRow, BankGuaranteeDashboardCounts } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import { BG_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';
import { followUps } from '@/db/schemas/shared/follow-ups.schema';

@Injectable()
export class BankGuaranteeService {
    private readonly logger = new Logger(BankGuaranteeService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
    ) { }

    private statusMap() {
        return {
            [BG_STATUSES.PENDING]: 'Pending',
            [BG_STATUSES.ACCOUNTS_FORM_ACCEPTED]: 'Accepted',
            [BG_STATUSES.ACCOUNTS_FORM_REJECTED]: 'Rejected',
            [BG_STATUSES.BG_CREATED]: 'Created',
            [BG_STATUSES.FDR_DETAILS_CAPTURED]: 'FDR Details Captured',
            [BG_STATUSES.FOLLOWUP_INITIATED]: 'Followup Initiated',
            [BG_STATUSES.EXTENSION_REQUESTED]: 'Extension Requested',
            [BG_STATUSES.RETURN_VIA_COURIER]: 'Courier Returned',
            [BG_STATUSES.CANCELLATION_REQUESTED]: 'Cancellation Request',
            [BG_STATUSES.BG_CANCELLATION_CONFIRMED]: 'Cancelled at Branch',
            [BG_STATUSES.FDR_CANCELLED_CONFIRMED]: 'FDR Cancellation Confirmed',
        };
    }

    private buildDashboardConditions(tab?: string) {
        const conditions: any[] = [
            eq(paymentInstruments.instrumentType, 'BG'),
            eq(paymentInstruments.isActive, true),
        ];

        if (tab === 'new-requests') {
            conditions.push(
                and(
                    inArray(paymentInstruments.action, [0, 1]),
                    inArray(paymentInstruments.status, [BG_STATUSES.PENDING, BG_STATUSES.ACCOUNTS_FORM_ACCEPTED]),
                )
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
                and(
                    inArray(paymentInstruments.action, [1, 2]),
                    eq(paymentInstruments.status, BG_STATUSES.ACCOUNTS_FORM_REJECTED)
                )
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
    ): Promise<PaginatedResult<BankGuaranteeDashboardRow>> {
        const page = options?.page || 1;
        const limit = options?.limit || 50;
        const offset = (page - 1) * limit;

        const conditions = this.buildDashboardConditions(tab);

        const searchTerm = options?.search?.trim();

        // Search filter - search across all rendered columns
        if (searchTerm) {
            const searchStr = `%${searchTerm}%`;
            const searchConditions: any[] = [
                sql`${paymentRequests.projectName} ILIKE ${searchStr}`,
                sql`${paymentRequests.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.bgNo} ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.beneficiaryName} ILIKE ${searchStr}`,
                sql`${paymentInstruments.amount}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.bgDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.validityDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.claimExpiryDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.fdrNo} ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.fdrAmt}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
                // Search by BG status display label (table shows "Pending", "Accepted", etc.)
                sql`(CASE ${paymentInstruments.status} WHEN 'BG_ACCOUNTS_FORM_PENDING' THEN 'Pending' WHEN 'BG_ACCOUNTS_FORM_ACCEPTED' THEN 'Accepted' WHEN 'BG_ACCOUNTS_FORM_REJECTED' THEN 'Rejected' WHEN 'BG_CREATED' THEN 'Created' WHEN 'BG_FDR_DETAILS_CAPTURED' THEN 'FDR Details Captured' WHEN 'BG_FOLLOWUP_INITIATED' THEN 'Followup Initiated' WHEN 'BG_EXTENSION_REQUESTED' THEN 'Extension Requested' WHEN 'BG_RETURN_VIA_COURIER' THEN 'Courier Returned' WHEN 'BG_CANCELLATION_REQUESTED' THEN 'Cancellation Request' WHEN 'BG_BG_CANCELLATION_CONFIRMED' THEN 'Cancelled at Branch' WHEN 'BG_FDR_CANCELLED_CONFIRMED' THEN 'FDR Cancellation Confirmed' ELSE ${paymentInstruments.status}::text END)::text ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
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
                requestId: paymentRequests.id,
                bgDate: instrumentBgDetails.bgDate,
                bgNo: instrumentBgDetails.bgNo,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                tenderName: tenderInfos.tenderName,
                tenderNo: tenderInfos.tenderNo,
                tenderDueDate: tenderInfos.dueDate,
                requestDueDate: paymentRequests.dueDate,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                requestType: paymentRequests.type,
                amount: paymentInstruments.amount,
                bgExpiryDate: paymentInstruments.expiryDate,
                claimExpiryDate: paymentInstruments.claimExpiryDate,
                stampCharges: instrumentBgDetails.stampCharges,
                sfmsCharges: instrumentBgDetails.sfmsCharges,
                stampChargesDeducted: instrumentBgDetails.stampChargesDeducted,
                sfmsChargesDeducted: instrumentBgDetails.sfmsChargesDeducted,
                otherChargesDeducted: instrumentBgDetails.otherChargesDeducted,
                bgChargeDeducted: instrumentBgDetails.bgChargeDeducted,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrValue: instrumentBgDetails.fdrAmt,
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

        // Count query (join tenderInfos and statuses when search is used so WHERE can reference them)
        let countQueryBuilder = this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id));
        if (searchTerm) {
            countQueryBuilder = countQueryBuilder
                .leftJoin(tenderInfos, and(
                    eq(tenderInfos.id, paymentRequests.tenderId),
                    ne(paymentRequests.tenderId, 0)
                ))
                .leftJoin(statuses, eq(statuses.id, tenderInfos.status));
        }
        const [countResult] = await countQueryBuilder.where(whereClause);

        const total = Number(countResult?.count || 0);

        // Map rows and apply calculations using helper functions
        const data: BankGuaranteeDashboardRow[] = rows.map((row) => {
            const bgDate = row.bgDate ? new Date(row.bgDate) : null;
            const bgExpiryDate = row.bgExpiryDate ? new Date(row.bgExpiryDate) : null;
            const claimExpiryDate = row.claimExpiryDate ? new Date(row.claimExpiryDate) : null;
            const amount = row.amount ? Number(row.amount) : null;

            return {
                id: row.id,
                requestId: row.requestId,
                bgDate,
                bgNo: row.bgNo,
                beneficiaryName: row.beneficiaryName,
                tenderName: row.tenderName || row.projectName,
                tenderNo: row.tenderNo || row.projectNo,
                amount,
                bgExpiryDate,
                bgClaimPeriod: this.calculateBgClaimPeriod(bgExpiryDate, claimExpiryDate),
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
                tenderStatus: row.tenderStatusFromTender,
                bidValidity: row.tenderDueDate || row.requestDueDate,
                bgStatus: this.statusMap()[row.bgStatus],
                expiryStatus: this.calculateExpiryStatus(bgExpiryDate, claimExpiryDate),
                expiryDate: claimExpiryDate,
            };
        });

        return wrapPaginatedResponse(data, total, page, limit);
    }

    private async countByConditions(conditions: any[]) {
        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${paymentInstruments.id})` })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(
                instrumentBgDetails,
                eq(instrumentBgDetails.instrumentId, paymentInstruments.id)
            )
            .where(and(...conditions));

        return Number(result?.count || 0);
    }

    async getDashboardCounts(): Promise<BankGuaranteeDashboardCounts> {
        const newRequests = await this.countByConditions(
            this.buildDashboardConditions('new-requests')
        );

        const liveYes = await this.countByConditions(
            this.buildDashboardConditions('live-yes')
        );

        const livePnb = await this.countByConditions(
            this.buildDashboardConditions('live-pnb')
        );

        const liveBgLimit = await this.countByConditions(
            this.buildDashboardConditions('live-bg-limit')
        );

        const cancelled = await this.countByConditions(
            this.buildDashboardConditions('cancelled')
        );

        const rejected = await this.countByConditions(
            this.buildDashboardConditions('rejected')
        );


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

            // 👉 Skip banks with 0 count
            if (bankCount === 0) {
                continue;
            }

            const bankAmount = bgs
                .filter(bg => bg.bgNo !== null && bg.bgNo !== '')
                .reduce((sum, bg) => sum + (bg.amount ? Number(bg.amount) : 0), 0);

            const fdrAmount10 = bgs
                .filter(bg => bg.bgNo && Number(bg.fdrPer) === 10)
                .reduce((sum, bg) => sum + (bg.fdrAmt ? Number(bg.fdrAmt) : 0), 0);

            const fdrAmount15 = bgs
                .filter(bg => bg.bgNo && Number(bg.fdrPer) === 15)
                .reduce((sum, bg) => sum + (bg.fdrAmt ? Number(bg.fdrAmt) : 0), 0);

            const fdrAmount100 = bgs
                .filter(bg => bg.bgNo && Number(bg.fdrPer) === 100)
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

        // 👉 Filter out banks with 0 count
        const filteredBankStats = Object.fromEntries(
            Object.entries(bankStats).filter(([_, stats]) => stats.count > 0)
        );

        return {
            bankStats: filteredBankStats,
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
            return '-';
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
            'accounts-form-1': 1, // Request to Bank
            'accounts-form-2': 2, // After BG Creation
            'accounts-form-3': 3, // FDR Details Captured
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
     * Get file path from body if it's a string (from TenderFileUploader)
     */
    private getFilePathFromBody(fieldname: string, body: any): string | null {
        if (body[fieldname] && typeof body[fieldname] === 'string') {
            return body[fieldname];
        }
        return null;
    }

    /**
     * Update instrument with form data (general edit)
     */
    async update(
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
            updatedAt: new Date(),
        };

        // Common instrument fields (partial list based on what might be edited)
        if (body.amount !== undefined) updateData.amount = body.amount;
        if (body.favouring !== undefined) updateData.favouring = body.favouring;
        if (body.payableAt !== undefined) updateData.payableAt = body.payableAt;
        if (body.issueDate !== undefined) updateData.issueDate = body.issueDate;
        if (body.expiryDate !== undefined) updateData.expiryDate = body.expiryDate;
        if (body.validityDate !== undefined) updateData.validityDate = body.validityDate;
        if (body.claimExpiryDate !== undefined) updateData.claimExpiryDate = body.claimExpiryDate;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.action !== undefined) updateData.action = body.action;
        if (body.utr !== undefined) updateData.utr = body.utr;
        if (body.docketNo !== undefined) updateData.docketNo = body.docketNo;
        if (body.courierAddress !== undefined) updateData.courierAddress = body.courierAddress;
        if (body.courierDeadline !== undefined) updateData.courierDeadline = body.courierDeadline;

        // Handle files for payment_instruments (if any were uploaded)
        const docketSlipFile = this.getFileForField('docket_slip', files, body, fileIndexTracker);
        if (docketSlipFile) updateData.docketSlip = `bi-dashboard/${docketSlipFile.filename}`;

        const coveringLetterFile = this.getFileForField('covering_letter', files, body, fileIndexTracker);
        if (coveringLetterFile) updateData.coveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;

        const cancelPdfFile = this.getFileForField('cancel_pdf', files, body, fileIndexTracker);
        if (cancelPdfFile) updateData.cancelPdf = `bi-dashboard/${cancelPdfFile.filename}`;

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Update instrument_bg_details
        const bgDetailsUpdate: any = {};

        // All possible BG details fields
        const directFields = [
            'bgNo', 'bgDate', 'validityDate', 'claimExpiryDate',
            'beneficiaryName', 'beneficiaryAddress', 'bankName',
            'cashMarginPercent', 'fdrMarginPercent',
            'stampCharges', 'sfmsCharges',
            'stampChargesDeducted', 'sfmsChargesDeducted', 'otherChargesDeducted',
            'extendedAmount', 'extendedValidityDate', 'extendedClaimExpiryDate',
            'extendedBankName', 'bgNeeds', 'bgPurpose', 'bgSoftCopy',
            'bgPo', 'bgClientUser', 'bgClientCp', 'bgClientFin',
            'bgBankAcc', 'bgBankIfsc', 'courierNo', 'stampCharge',
            'extensionLetter', 'newBgClaim', 'approveBg',
            'fdrAmt', 'fdrPer', 'fdrNo', 'fdrValidity', 'fdrRoi',
            'bgChargeDeducted', 'newStampChargeDeducted', 'cancelRemark',
            'bgFdrCancelDate', 'bgFdrCancelAmount', 'bgFdrCancelRefNo',
            'bg2Remark', 'reasonReq'
        ];

        directFields.forEach(field => {
            if (body[field] !== undefined) {
                bgDetailsUpdate[field] = body[field] === '' ? null : body[field];
            }
        });

        // Handle file fields for BG details
        const fileFields = [
            { body: 'extension_letter_path', db: 'extensionLetterPath' },
            { body: 'cancellation_letter_path', db: 'cancellationLetterPath' },
            { body: 'bg_format_te', db: 'bgFormatTe' },
            { body: 'bg_format_tl', db: 'bgFormatTl' },
            { body: 'sfms_conf', db: 'sfmsConf' },
            { body: 'fdr_copy', db: 'fdrCopy' },
            { body: 'stamp_covering_letter', db: 'stampCoveringLetter' },
            { body: 'cancell_confirm', db: 'cancellConfirm' },
        ];

        fileFields.forEach(f => {
            const uploadedFile = this.getFileForField(f.body, files, body, fileIndexTracker);
            if (uploadedFile) {
                bgDetailsUpdate[f.db] = `bi-dashboard/${uploadedFile.filename}`;
            } else if (body[f.body] && typeof body[f.body] === 'string') {
                // If it's a string path, keep it if it's not a dummy marker
                if (!body[f.body].includes('[object File]')) {
                    bgDetailsUpdate[f.db] = body[f.body];
                }
            }
        });

        // Handle prefilledSignedBg separately (it's often JSON or multiple files)
        const prefilledFiles = this.getMultipleFilesForField('prefilled_signed_bg', files, body, fileIndexTracker);
        if (prefilledFiles.length > 0) {
            const filePaths = prefilledFiles.map(f => `bi-dashboard/${f.filename}`);
            bgDetailsUpdate.prefilledSignedBg = JSON.stringify(filePaths);
        } else if (body.prefilled_signed_bg && typeof body.prefilled_signed_bg === 'string') {
            if (!body.prefilled_signed_bg.includes('[object File]')) {
                bgDetailsUpdate.prefilledSignedBg = body.prefilled_signed_bg;
            }
        }

        if (Object.keys(bgDetailsUpdate).length > 0) {
            bgDetailsUpdate.updatedAt = new Date();

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
                await this.db.insert(instrumentBgDetails).values({
                    instrumentId,
                    ...bgDetailsUpdate,
                    createdAt: new Date(),
                });
            }
        }

        return {
            success: true,
            instrumentId,
        };
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
            const docketSlipPath = this.getFilePathFromBody('docket_slip', body);
            if (docketSlipFile) {
                updateData.docketSlip = `bi-dashboard/${docketSlipFile.filename}`;
            } else if (docketSlipPath) {
                updateData.docketSlip = docketSlipPath;
            }
        } else if (body.action === 'request-cancellation') {
            updateData.status = 'CANCELLATION_REQUESTED';
            const coveringLetterFile = this.getFileForField('stamp_covering_letter', files, body, fileIndexTracker);
            const coveringLetterPath = this.getFilePathFromBody('stamp_covering_letter', body);
            if (coveringLetterFile) {
                updateData.coveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;
            } else if (coveringLetterPath) {
                updateData.coveringLetter = coveringLetterPath;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            updateData.status = 'BG_CANCELLED';
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            const cancellConfirmPath = this.getFilePathFromBody('cancell_confirm', body);
            if (cancellConfirmFile) {
                updateData.cancelPdf = `bi-dashboard/${cancellConfirmFile.filename}`;
            } else if (cancellConfirmPath) {
                updateData.cancelPdf = cancellConfirmPath;
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
            const bgFormatImranPath = this.getFilePathFromBody('bg_format_imran', body);
            if (bgFormatImranFile) {
                bgDetailsUpdate.bgFormatTe = `bi-dashboard/${bgFormatImranFile.filename}`;
            } else if (bgFormatImranPath) {
                bgDetailsUpdate.bgFormatTe = bgFormatImranPath;
            }

            // Handle prefilled_signed_bg files (multiple files)
            const prefilledFiles = this.getMultipleFilesForField('prefilled_signed_bg', files, body, fileIndexTracker);
            const prefilledPath = this.getFilePathFromBody('prefilled_signed_bg', body);
            if (prefilledFiles.length > 0) {
                const filePaths = prefilledFiles.map(f => `bi-dashboard/${f.filename}`);
                bgDetailsUpdate.prefilledSignedBg = JSON.stringify(filePaths);
            } else if (prefilledPath) {
                // If it's a string path (from TenderFileUploader), parse it if it's JSON array or use as single path
                try {
                    const parsed = JSON.parse(prefilledPath);
                    if (Array.isArray(parsed)) {
                        bgDetailsUpdate.prefilledSignedBg = JSON.stringify(parsed);
                    } else {
                        bgDetailsUpdate.prefilledSignedBg = JSON.stringify([prefilledPath]);
                    }
                } catch {
                    bgDetailsUpdate.prefilledSignedBg = JSON.stringify([prefilledPath]);
                }
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
            const sfmsConfPath = this.getFilePathFromBody('sfms_conf', body);
            if (sfmsConfFile) {
                bgDetailsUpdate.sfmsConf = `bi-dashboard/${sfmsConfFile.filename}`;
            } else if (sfmsConfPath) {
                bgDetailsUpdate.sfmsConf = sfmsConfPath;
            }

            // Handle fdr_copy file
            const fdrCopyFile = this.getFileForField('fdr_copy', files, body, fileIndexTracker);
            const fdrCopyPath = this.getFilePathFromBody('fdr_copy', body);
            if (fdrCopyFile) {
                bgDetailsUpdate.fdrCopy = `bi-dashboard/${fdrCopyFile.filename}`;
            } else if (fdrCopyPath) {
                bgDetailsUpdate.fdrCopy = fdrCopyPath;
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
            const extLetterPath = this.getFilePathFromBody('ext_letter', body);
            if (extLetterFile) {
                bgDetailsUpdate.extensionLetterPath = `bi-dashboard/${extLetterFile.filename}`;
            } else if (extLetterPath) {
                bgDetailsUpdate.extensionLetterPath = extLetterPath;
            }
        } else if (body.action === 'returned-courier') {
            if (body.docket_no) bgDetailsUpdate.courierNo = body.docket_no;
            // Note: docket_slip file is already handled in updateData section (paymentInstruments.docketSlip)
        } else if (body.action === 'request-cancellation') {
            if (body.cancel_remark) bgDetailsUpdate.cancelRemark = body.cancel_remark;
            const coveringLetterFile = this.getFileForField('stamp_covering_letter', files, body, fileIndexTracker);
            const coveringLetterPath = this.getFilePathFromBody('stamp_covering_letter', body);
            if (coveringLetterFile) {
                bgDetailsUpdate.stampCoveringLetter = `bi-dashboard/${coveringLetterFile.filename}`;
            } else if (coveringLetterPath) {
                bgDetailsUpdate.stampCoveringLetter = coveringLetterPath;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            const cancellConfirmPath = this.getFilePathFromBody('cancell_confirm', body);
            if (cancellConfirmFile) {
                bgDetailsUpdate.cancellConfirm = `bi-dashboard/${cancellConfirmFile.filename}`;
            } else if (cancellConfirmPath) {
                bgDetailsUpdate.cancellConfirm = cancellConfirmPath;
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

        // Follow-up creation will be handled by a different service class

        return {
            success: true,
            instrumentId,
            action: body.action,
            actionNumber,
        };
    }

    async getById(id: number) {
        const [result] = await this.db
            .select({
                // Payment Instrument fields
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

                // Payment Request fields
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

                // BG Details - all fields
                bgDetailsId: instrumentBgDetails.id,
                bgNo: instrumentBgDetails.bgNo,
                bgDate: instrumentBgDetails.bgDate,
                claimExpiryDateBg: instrumentBgDetails.claimExpiryDate,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                beneficiaryAddress: instrumentBgDetails.beneficiaryAddress,
                bankName: instrumentBgDetails.bankName,
                cashMarginPercent: instrumentBgDetails.cashMarginPercent,
                fdrMarginPercent: instrumentBgDetails.fdrMarginPercent,
                stampCharges: instrumentBgDetails.stampCharges,
                sfmsCharges: instrumentBgDetails.sfmsCharges,
                stampChargesDeducted: instrumentBgDetails.stampChargesDeducted,
                sfmsChargesDeducted: instrumentBgDetails.sfmsChargesDeducted,
                otherChargesDeducted: instrumentBgDetails.otherChargesDeducted,
                extendedAmount: instrumentBgDetails.extendedAmount,
                extendedValidityDate: instrumentBgDetails.extendedValidityDate,
                extendedClaimExpiryDate: instrumentBgDetails.extendedClaimExpiryDate,
                extendedBankName: instrumentBgDetails.extendedBankName,
                extensionLetterPath: instrumentBgDetails.extensionLetterPath,
                cancellationLetterPath: instrumentBgDetails.cancellationLetterPath,
                prefilledSignedBg: instrumentBgDetails.prefilledSignedBg,
                bgNeeds: instrumentBgDetails.bgNeeds,
                bgPurpose: instrumentBgDetails.bgPurpose,
                bgSoftCopy: instrumentBgDetails.bgSoftCopy,
                bgPo: instrumentBgDetails.bgPo,
                bgClientUser: instrumentBgDetails.bgClientUser,
                bgClientCp: instrumentBgDetails.bgClientCp,
                bgClientFin: instrumentBgDetails.bgClientFin,
                bgBankAcc: instrumentBgDetails.bgBankAcc,
                bgBankIfsc: instrumentBgDetails.bgBankIfsc,
                courierNo: instrumentBgDetails.courierNo,
                stampCharge: instrumentBgDetails.stampCharge,
                extensionLetter: instrumentBgDetails.extensionLetter,
                newBgClaim: instrumentBgDetails.newBgClaim,
                approveBg: instrumentBgDetails.approveBg,
                bgFormatTe: instrumentBgDetails.bgFormatTe,
                bgFormatTl: instrumentBgDetails.bgFormatTl,
                sfmsConf: instrumentBgDetails.sfmsConf,
                fdrAmt: instrumentBgDetails.fdrAmt,
                fdrPer: instrumentBgDetails.fdrPer,
                fdrCopy: instrumentBgDetails.fdrCopy,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrValidity: instrumentBgDetails.fdrValidity,
                fdrRoi: instrumentBgDetails.fdrRoi,
                bgChargeDeducted: instrumentBgDetails.bgChargeDeducted,
                newStampChargeDeducted: instrumentBgDetails.newStampChargeDeducted,
                stampCoveringLetter: instrumentBgDetails.stampCoveringLetter,
                cancelRemark: instrumentBgDetails.cancelRemark,
                cancellConfirm: instrumentBgDetails.cancellConfirm,
                bgFdrCancelDate: instrumentBgDetails.bgFdrCancelDate,
                bgFdrCancelAmount: instrumentBgDetails.bgFdrCancelAmount,
                bgFdrCancelRefNo: instrumentBgDetails.bgFdrCancelRefNo,
                bg2Remark: instrumentBgDetails.bg2Remark,
                reasonReq: instrumentBgDetails.reasonReq,
                bgDetailsCreatedAt: instrumentBgDetails.createdAt,
                bgDetailsUpdatedAt: instrumentBgDetails.updatedAt,

                // Tender Info fields
                tenderName: tenderInfos.tenderName,
                tenderDueDate: tenderInfos.dueDate,
                tenderStatusId: tenderInfos.status,
                tenderOrganizationId: tenderInfos.organization,
                tenderItemId: tenderInfos.item,
                tenderTeamMember: tenderInfos.teamMember,

                // Status fields
                tenderStatusName: statuses.name,

                // User fields
                requestedByName: users.name,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .leftJoin(tenderInfos, and(
                eq(tenderInfos.id, paymentRequests.tenderId),
                ne(paymentRequests.tenderId, 0)
            ))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .where(and(
                eq(paymentRequests.id, id),
                eq(paymentInstruments.instrumentType, 'BG'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Request with ID ${id} not found`);
        }

        return result;
    }

    async getActionFormData(id: number) {
        const [result] = await this.db
            .select({
                id: paymentInstruments.id,
                action: paymentInstruments.action,
                status: paymentInstruments.status,
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
                courierDeadline: paymentInstruments.courierDeadline,
                generatedPdf: paymentInstruments.generatedPdf,
                cancelPdf: paymentInstruments.cancelPdf,
                docketSlip: paymentInstruments.docketSlip,
                coveringLetter: paymentInstruments.coveringLetter,
                extensionRequestPdf: paymentInstruments.extensionRequestPdf,
                cancellationRequestPdf: paymentInstruments.cancellationRequestPdf,
                tenderNo: paymentRequests.tenderNo,
                tenderName: paymentRequests.projectName,
                tenderId: paymentRequests.tenderId,
                bgNo: instrumentBgDetails.bgNo,
                bgDate: instrumentBgDetails.bgDate,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                beneficiaryAddress: instrumentBgDetails.beneficiaryAddress,
                bankName: instrumentBgDetails.bankName,
                bgNeeds: instrumentBgDetails.bgNeeds,
                bgPurpose: instrumentBgDetails.bgPurpose,
                bgSoftCopy: instrumentBgDetails.bgSoftCopy,
                bgPo: instrumentBgDetails.bgPo,
                courierNo: instrumentBgDetails.courierNo,
                stampCharge: instrumentBgDetails.stampCharge,
                extendedAmount: instrumentBgDetails.extendedAmount,
                extendedValidityDate: instrumentBgDetails.extendedValidityDate,
                extendedClaimExpiryDate: instrumentBgDetails.extendedClaimExpiryDate,
                extendedBankName: instrumentBgDetails.extendedBankName,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrAmt: instrumentBgDetails.fdrAmt,
                fdrValidity: instrumentBgDetails.fdrValidity,
                fdrRoi: instrumentBgDetails.fdrRoi,
            })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(instrumentBgDetails, eq(instrumentBgDetails.instrumentId, paymentInstruments.id))
            .where(and(
                eq(paymentInstruments.id, id),
                eq(paymentInstruments.instrumentType, 'BG'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${id} not found`);
        }

        const hasAccountsFormData = result.action != null && result.action >= 1;
        const hasFdrDetails = !!(result.fdrNo || result.fdrAmt);
        const hasCourierInfo = !!(result.courierAddress || result.courierNo || result.docketNo);
        const hasExtensionDetails = !!(result.extendedAmount || result.extendedValidityDate);
        const hasReturnedData = result.action != null && result.action >= 6;
        const hasSettledData = result.action != null && [8, 9].includes(result.action);

        return {
            id: result.id,
            action: result.action,
            bgStatus: this.statusMap()[result.status] || result.status,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            validityDate: result.validityDate ? new Date(result.validityDate) : null,
            claimExpiryDate: result.claimExpiryDate ? new Date(result.claimExpiryDate) : null,
            bgNo: result.bgNo,
            bgDate: result.bgDate ? new Date(result.bgDate) : null,
            beneficiaryName: result.beneficiaryName,
            beneficiaryAddress: result.beneficiaryAddress,
            bankName: result.bankName,
            bgNeeds: result.bgNeeds,
            bgPurpose: result.bgPurpose,
            bgSoftCopy: result.bgSoftCopy,
            bgPo: result.bgPo,
            courierNo: result.courierNo,
            courierAddress: result.courierAddress,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            stampCharge: result.stampCharge ? Number(result.stampCharge) : null,
            utr: result.utr,
            docketNo: result.docketNo,
            generatedPdf: result.generatedPdf,
            cancelPdf: result.cancelPdf,
            docketSlip: result.docketSlip,
            coveringLetter: result.coveringLetter,
            extensionRequestPdf: result.extensionRequestPdf,
            cancellationRequestPdf: result.cancellationRequestPdf,
            extendedAmount: result.extendedAmount ? Number(result.extendedAmount) : null,
            extendedValidityDate: result.extendedValidityDate ? new Date(result.extendedValidityDate) : null,
            extendedClaimExpiryDate: result.extendedClaimExpiryDate ? new Date(result.extendedClaimExpiryDate) : null,
            extendedBankName: result.extendedBankName,
            fdrNo: result.fdrNo,
            fdrAmt: result.fdrAmt ? Number(result.fdrAmt) : null,
            fdrValidity: result.fdrValidity ? new Date(result.fdrValidity) : null,
            fdrRoi: result.fdrRoi ? Number(result.fdrRoi) : null,
            hasAccountsFormData,
            hasFdrDetails,
            hasCourierInfo,
            hasExtensionDetails,
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
