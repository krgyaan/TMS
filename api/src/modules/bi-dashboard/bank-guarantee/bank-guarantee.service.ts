import { followUps } from '@/db/schemas/shared/follow-ups.schema';
import { followUpPersons } from '@/db/schemas/shared/follow-up-persons.schema';
import { couriers } from '@/db/schemas/shared/couriers.schema';
import { AppLogger } from '@/logger/app-logger.service';
import { PaymentRequestsNotificationService } from '@/modules/tendering/payment-requests/services/payment-requests-notification.service';
import type { BankGuaranteeDashboardCounts, BankGuaranteeDashboardRow } from '@/modules/bi-dashboard/bank-guarantee/helpers/bankGuarantee.types';
import { FollowUpService } from '@/modules/follow-up/follow-up.service';
import type { CreateFollowUpDto } from '@/modules/follow-up/zod';
import { BG_STATUSES } from '@/modules/tendering/payment-requests/constants/payment-request-statuses';
import type { PaginatedResult } from '@/modules/tendering/types/shared.types';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import type { DbInstance } from '@db';
import { DRIZZLE } from '@db/database.module';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import {
    instrumentBgDetails,
    instrumentStatusHistory,
    paymentInstruments,
    paymentRequests,
} from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

@Injectable()
export class BankGuaranteeService {
    private readonly logger;

    constructor(
        private readonly appLogger: AppLogger,
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly followUpService: FollowUpService,
        private readonly paymentRequestsNotificationService: PaymentRequestsNotificationService,
    ) {
        this.logger = this.appLogger.withContext(BankGuaranteeService.name);
    }

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
            // Legacy rows written with pre-migration status strings.
            RETURNED_VIA_COURIER: 'Courier Returned',
            BG_CANCELLED: 'Cancelled at Branch',
            FDR_CANCELLED: 'FDR Cancellation Confirmed',
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
        } else if (tab === 'live-sbi') {
            conditions.push(
                inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
                eq(instrumentBgDetails.bankName, 'SBI')
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
                sql`${paymentInstruments.expiryDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.bgExpiryDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.claimExpiryDate}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.bgClaim}::text ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.fdrNo} ILIKE ${searchStr}`,
                sql`${instrumentBgDetails.fdrAmt}::text ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`,
                // Search by BG status display label (table shows "Pending", "Accepted", etc.)
                sql`(CASE ${paymentInstruments.status} WHEN 'PENDING' THEN 'Pending' WHEN 'ACCOUNTS_FORM_ACCEPTED' THEN 'Accepted' WHEN 'ACCOUNTS_FORM_REJECTED' THEN 'Rejected' WHEN 'BG_CREATED' THEN 'Created' WHEN 'FDR_DETAILS_CAPTURED' THEN 'FDR Details Captured' WHEN 'FOLLOWUP_INITIATED' THEN 'Followup Initiated' WHEN 'EXTENSION_REQUESTED' THEN 'Extension Requested' WHEN 'RETURN_VIA_COURIER' THEN 'Courier Returned' WHEN 'CANCELLATION_REQUESTED' THEN 'Cancellation Request' WHEN 'BG_CANCELLATION_CONFIRMED' THEN 'Cancelled at Branch' WHEN 'FDR_CANCELLED_CONFIRMED' THEN 'FDR Cancellation Confirmed' ELSE ${paymentInstruments.status}::text END)::text ILIKE ${searchStr}`,
            ];
            conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
        }

        const whereClause = and(...conditions);

        // Build order clause - default to coalesced BG expiry date desc, fallback to createdAt
        const defaultOrder = sql`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate}) DESC NULLS LAST, ${paymentInstruments.createdAt} DESC`;
        let orderClause: any = defaultOrder;
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
                case 'bgExpiryDateCoalesced':
                    orderClause = direction(sql`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate})`);
                    break;
                case 'bgClaimExpiryDate':
                    orderClause = direction(instrumentBgDetails.claimExpiryDate);
                    break;
                default:
                    orderClause = defaultOrder;
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
                claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                validityDate: instrumentBgDetails.validityDate,
                bgClaim: instrumentBgDetails.bgClaim,
                bgExpiryDateBg: sql<string | null>`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate})`,
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
            const effectiveClaimDate = claimExpiryDate ?? (row.bgClaim ? new Date(row.bgClaim) : null);
            const effectiveValidityDate = (row.validityDate ? new Date(row.validityDate) : null)
                ?? (row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null);
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
                bgExpiryDateCoalesced: row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null,
                bgClaimExpiryDate: claimExpiryDate,
                bgClaimPeriod: this.calculateBgClaimPeriod(effectiveValidityDate, effectiveClaimDate),
                bgChargesPaid: this.calculateBgChargesPaid(
                    row.bgChargeDeducted ? Number(row.bgChargeDeducted) : null,
                    row.stampChargesDeducted ? Number(row.stampChargesDeducted) : null,
                    row.sfmsChargesDeducted ? Number(row.sfmsChargesDeducted) : null,
                    row.otherChargesDeducted ? Number(row.otherChargesDeducted) : null
                ),
                bgChargesCalculated: this.calculateBgChargesCalculated(
                    amount,
                    bgDate,
                    effectiveClaimDate,
                    row.stampCharges ? Number(row.stampCharges) : null,
                    row.sfmsCharges ? Number(row.sfmsCharges) : null
                ),
                fdrNo: row.fdrNo,
                fdrValue: row.fdrValue ? Number(row.fdrValue) : null,
                tenderStatus: row.tenderStatusFromTender,
                bidValidity: row.tenderDueDate || row.requestDueDate,
                bgStatus: this.statusMap()[row.bgStatus],
                expiryStatus: this.calculateExpiryStatus(
                    row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null,
                    claimExpiryDate,
                ),
                expiryDate: effectiveClaimDate,
            };
        });

        return wrapPaginatedResponse(data, total, page, limit);
    }

    async getExportData(
        tab?: string,
    ): Promise<{ data: any[] }> {
        const conditions = this.buildDashboardConditions(tab);
        const whereClause = and(...conditions);

        const rows = await this.db
            .select({
                id: paymentInstruments.id,
                requestId: paymentRequests.id,
                bgDate: instrumentBgDetails.bgDate,
                bgNo: instrumentBgDetails.bgNo,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                tenderDueDate: tenderInfos.dueDate,
                requestDueDate: paymentRequests.dueDate,
                projectName: paymentRequests.projectName,
                projectNo: paymentRequests.tenderNo,
                requestType: paymentRequests.type,
                amount: paymentInstruments.amount,
                bgExpiryDate: paymentInstruments.expiryDate,
                claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                validityDate: instrumentBgDetails.validityDate,
                bgClaim: instrumentBgDetails.bgClaim,
                bgExpiryDateBg: sql<string | null>`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate})`,
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
                bgPurpose: instrumentBgDetails.bgPurpose,
                bgNeeds: instrumentBgDetails.bgNeeds,
                bankName: instrumentBgDetails.bankName,
                issueDate: paymentInstruments.issueDate,
                expiryDate: paymentInstruments.expiryDate,
                payableAt: paymentInstruments.payableAt,
                favouring: paymentInstruments.favouring,
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
            .orderBy(sql`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate}) DESC NULLS LAST, ${paymentInstruments.createdAt} DESC`);

        const data = rows.map((row) => {
            const bgDate = row.bgDate ? new Date(row.bgDate) : null;
            const bgExpiryDate = row.bgExpiryDate ? new Date(row.bgExpiryDate) : null;
            const claimExpiryDate = row.claimExpiryDate ? new Date(row.claimExpiryDate) : null;
            const effectiveClaimDate = claimExpiryDate ?? (row.bgClaim ? new Date(row.bgClaim) : null);
            const effectiveValidityDate = (row.validityDate ? new Date(row.validityDate) : null)
                ?? (row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null);
            const amount = row.amount ? Number(row.amount) : null;

            return {
                id: row.id,
                requestId: row.requestId,
                bgDate,
                bgNo: row.bgNo,
                beneficiaryName: row.beneficiaryName,
                projectName: row.projectName,
                projectNo: row.projectNo,
                amount,
                bgExpiryDate,
                bgExpiryDateCoalesced: row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null,
                bgClaimExpiryDate: claimExpiryDate,
                bgClaimPeriod: this.calculateBgClaimPeriod(effectiveValidityDate, effectiveClaimDate),
                bgChargesPaid: this.calculateBgChargesPaid(
                    row.bgChargeDeducted ? Number(row.bgChargeDeducted) : null,
                    row.stampChargesDeducted ? Number(row.stampChargesDeducted) : null,
                    row.sfmsChargesDeducted ? Number(row.sfmsChargesDeducted) : null,
                    row.otherChargesDeducted ? Number(row.otherChargesDeducted) : null
                ),
                bgChargesCalculated: this.calculateBgChargesCalculated(
                    amount,
                    bgDate,
                    effectiveClaimDate,
                    row.stampCharges ? Number(row.stampCharges) : null,
                    row.sfmsCharges ? Number(row.sfmsCharges) : null
                ),
                fdrNo: row.fdrNo,
                fdrValue: row.fdrValue ? Number(row.fdrValue) : null,
                tenderStatus: row.tenderStatusFromTender,
                bidValidity: row.tenderDueDate || row.requestDueDate,
                bgStatus: this.statusMap()[row.bgStatus],
                expiryStatus: this.calculateExpiryStatus(
                    row.bgExpiryDateBg ? new Date(row.bgExpiryDateBg) : null,
                    claimExpiryDate,
                ),
                expiryDate: effectiveValidityDate,
                bgPurpose: row.bgPurpose,
                bgNeeds: row.bgNeeds,
                bankName: row.bankName,
                issueDate: row.issueDate ? new Date(row.issueDate) : null,
                payableAt: row.payableAt,
                favouring: row.favouring,
            };
        });

        return { data };
    }

    async getDashboardCounts(): Promise<BankGuaranteeDashboardCounts> {
        const baseWhere = and(
            eq(paymentInstruments.instrumentType, 'BG'),
            eq(paymentInstruments.isActive, true),
        );

        const newRequestsFilter = and(
            inArray(paymentInstruments.action, [0, 1]),
            inArray(paymentInstruments.status, [BG_STATUSES.PENDING, BG_STATUSES.ACCOUNTS_FORM_ACCEPTED]),
        );

        const livePnbFilter = and(
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            eq(instrumentBgDetails.bankName, 'PNB_6011'),
        );

        const liveBgLimitFilter = and(
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            eq(instrumentBgDetails.bankName, 'BGLIMIT_0771'),
        );

        const liveSbiFilter = and(
            inArray(paymentInstruments.action, [2, 3, 4, 5, 6, 7]),
            eq(instrumentBgDetails.bankName, 'SBI'),
        );

        const cancelledFilter = inArray(paymentInstruments.action, [8, 9]);

        const rejectedFilter = and(
            inArray(paymentInstruments.action, [1, 2]),
            eq(paymentInstruments.status, BG_STATUSES.ACCOUNTS_FORM_REJECTED),
        );

        const [counts] = await this.db.select({
            newRequests: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${newRequestsFilter})`,
            livePnb: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${livePnbFilter})`,
            liveBgLimit: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${liveBgLimitFilter})`,
            liveSbi: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${liveSbiFilter})`,
            cancelled: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${cancelledFilter})`,
            rejected: sql<number>`count(distinct ${paymentInstruments.id}) filter (where ${rejectedFilter})`,
        })
            .from(paymentInstruments)
            .innerJoin(paymentRequests, eq(paymentRequests.id, paymentInstruments.requestId))
            .leftJoin(
                instrumentBgDetails,
                eq(instrumentBgDetails.instrumentId, paymentInstruments.id),
            )
            .where(baseWhere);

        const newRequests = Number(counts?.newRequests ?? 0);
        const livePnb = Number(counts?.livePnb ?? 0);
        const liveBgLimit = Number(counts?.liveBgLimit ?? 0);
        const liveSbi = Number(counts?.liveSbi ?? 0);
        const cancelled = Number(counts?.cancelled ?? 0);
        const rejected = Number(counts?.rejected ?? 0);

        return {
            'new-requests': newRequests,
            'live-pnb': livePnb,
            'live-bg-limit': liveBgLimit,
            'live-sbi': liveSbi,
            cancelled,
            rejected,
            total: newRequests + livePnb + liveBgLimit + liveSbi + cancelled + rejected,
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
     * Stored path for a raw multer file, mirroring the FileUploader layout
     * `bi-dashboard/bank-guarantee/<context>/<fileName>` (the web UI uploads
     * through /files/upload, which already returns this shape).
     */
    private bgFileStoredPath(context: string, filename: string): string {
        return `bi-dashboard/bank-guarantee/${context}/${filename}`;
    }

/**
 * Parse a repeatable string field sent from a form as a JSON string.
 * Tolerates a bare string too, and returns null when absent so an omitted field
 * leaves the column alone (an emptied list arrives as "[]" and clears it).
 */
private parseStringArray(v: unknown): string[] | null {
    if (v === undefined || v === null) return null;
    const arr = typeof v === 'string'
        ? (() => { try { return JSON.parse(v); } catch { return [v]; } })()
        : v;
    if (!Array.isArray(arr)) return null;
    return arr.map((x) => String(x).trim()).filter(Boolean);
}

private hasFileValue(v: unknown): boolean {
    return (this.parseStringArray(v)?.length ?? 0) > 0;
}

private isEmptyFileValue(v: unknown): boolean {
    if (Array.isArray(v)) return v.length === 0;
    return typeof v === 'string' && v.trim() === '[]';
}

private readBodyFileValue(body: unknown, field: string): unknown {
    if (body === null || typeof body !== 'object') return undefined;
    return (body as Record<string, unknown>)[field];
}

/**
 * Get file path from body if it's a string (from FileUploader)
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
        if (body.status !== undefined) updateData.status = body.status;
        if (body.action !== undefined) updateData.action = body.action;
        if (body.docketNo !== undefined) updateData.docketNo = body.docketNo;
        if (body.courierAddress !== undefined) updateData.courierAddress = body.courierAddress;
        if (body.courierDeadline !== undefined) updateData.courierDeadline = body.courierDeadline;
        if (body.req_no !== undefined && body.req_no !== null && body.req_no !== '') {
            updateData.reqNo = String(body.req_no);
        }
        if (body.courier_address_json) {
            try {
                updateData.courierAddressJson = typeof body.courier_address_json === 'string'
                    ? JSON.parse(body.courier_address_json)
                    : body.courier_address_json;
            } catch {
                updateData.courierAddressJson = null;
            }
        }

        // Handle files for payment_instruments (if any were uploaded)
        const docketSlipFile = this.getFileForField('docket_slip', files, body, fileIndexTracker);
        if (docketSlipFile) {
            updateData.docketSlip = this.bgFileStoredPath('bg-docket-slip', docketSlipFile.filename);
        } else if (this.isEmptyFileValue(this.readBodyFileValue(body, 'docket_slip'))) {
            updateData.docketSlip = null;
        } else if (body.docket_slip && typeof body.docket_slip === 'string' && !body.docket_slip.includes('[object File]')) {
            updateData.docketSlip = body.docket_slip;
        }

        const coveringLetterFile = this.getFileForField('covering_letter', files, body, fileIndexTracker);
        if (coveringLetterFile) {
            updateData.coveringLetter = this.bgFileStoredPath('bg-stamp-covering-letter', coveringLetterFile.filename);
        } else if (body.covering_letter && typeof body.covering_letter === 'string' && !body.covering_letter.includes('[object File]')) {
            updateData.coveringLetter = body.covering_letter;
        }

        const cancelPdfFile = this.getFileForField('cancel_pdf', files, body, fileIndexTracker);
        if (cancelPdfFile) {
            updateData.cancelPdf = this.bgFileStoredPath('bg-cancell-confirm', cancelPdfFile.filename);
        } else if (body.cancel_pdf && typeof body.cancel_pdf === 'string' && !body.cancel_pdf.includes('[object File]')) {
            updateData.cancelPdf = body.cancel_pdf;
        }

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Update instrument_bg_details
        const bgDetailsUpdate: any = {};

        // All possible BG details fields
        const directFields = [
            'bgNo', 'bgDate', 'bgExpiryDate', 'bgClaim',
            'validityDate', 'claimExpiryDate',
            'beneficiaryName', 'beneficiaryAddress', 'bankName',
            'cashMarginPercent', 'fdrMarginPercent',
            'stampCharges', 'sfmsCharges',
            'stampChargesDeducted', 'sfmsChargesDeducted', 'otherChargesDeducted',
            'extendedAmount', 'extendedValidityDate', 'extendedClaimExpiryDate',
            'extendedBankName', 'bgNeeds', 'bgPurpose', 'bgSoftCopy',
            'bgPo', 'bgClientUser', 'bgClientCp', 'bgClientFin',
            'bgBankAcc', 'bgBankIfsc', 'bgBankAccName', 'courierNo',
            'extensionLetter', 'newBgClaim', 'approveBg',
            'fdrAmt', 'fdrPer', 'fdrNo', 'fdrValidity', 'fdrRoi',
            'bankMailIds', 'bankMailIdsCc',
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
            { body: 'extension_letter_path', db: 'extensionLetterPath', ctx: 'bg-ext-letter' },
            { body: 'cancellation_letter_path', db: 'cancellationLetterPath', ctx: 'bg-stamp-covering-letter' },
            { body: 'bg_format_te', db: 'bgFormatTe', ctx: 'bg-format-imran' },
            { body: 'bg_format_tl', db: 'bgFormatTl', ctx: 'bg-format-imran' },
            { body: 'sfms_conf', db: 'sfmsConf', ctx: 'bg-sfms-conf' },
            { body: 'fdr_copy', db: 'fdrCopy', ctx: 'bg-fdr-copy' },
            { body: 'stamp_covering_letter', db: 'stampCoveringLetter', ctx: 'bg-stamp-covering-letter' },
            { body: 'cancell_confirm', db: 'cancellConfirm', ctx: 'bg-cancell-confirm' },
        ];

        fileFields.forEach(f => {
            const uploadedFile = this.getFileForField(f.body, files, body, fileIndexTracker);
            if (uploadedFile) {
                bgDetailsUpdate[f.db] = this.bgFileStoredPath(f.ctx, uploadedFile.filename);
            } else if (this.isEmptyFileValue(this.readBodyFileValue(body, f.body))) {
                bgDetailsUpdate[f.db] = null;
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
            const filePaths = prefilledFiles.map(f => this.bgFileStoredPath('bg-prefilled-signed', f.filename));
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
        const fromStatus = instrument.status;
        const fromAction = instrument.action ?? 0;
        const toAction = actionNumber;

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
        let nextStatus: string | undefined;
        if (body.action === 'accounts-form-1') {
            if (body.bg_req === 'Accepted') {
                nextStatus = 'ACCOUNTS_FORM_ACCEPTED';
            } else if (body.bg_req === 'Rejected') {
                nextStatus = 'ACCOUNTS_FORM_REJECTED';
                updateData.rejectionReason = body.reason_req || null;
            }
        } else if (body.action === 'accounts-form-2') {
            nextStatus = 'BG_CREATED';
            if (body.req_no) updateData.reqNo = String(body.req_no);
            if (body.courier_address_json) {
                try {
                    updateData.courierAddressJson = typeof body.courier_address_json === 'string'
                        ? JSON.parse(body.courier_address_json)
                        : body.courier_address_json;
                } catch {
                    updateData.courierAddressJson = null;
                }
            }
        } else if (body.action === 'accounts-form-3') {
            nextStatus = 'FDR_DETAILS_CAPTURED';
        } else if (body.action === 'initiate-followup') {
            nextStatus = 'FOLLOWUP_INITIATED';
        } else if (body.action === 'request-extension') {
            nextStatus = 'EXTENSION_REQUESTED';
        } else if (body.action === 'returned-courier') {
            nextStatus = BG_STATUSES.RETURN_VIA_COURIER;
            const docketSlipFile = this.getFileForField('docket_slip', files, body, fileIndexTracker);
            const docketSlipPath = this.getFilePathFromBody('docket_slip', body);
            if (docketSlipFile) {
                updateData.docketSlip = this.bgFileStoredPath('bg-docket-slip', docketSlipFile.filename);
            } else if (docketSlipPath) {
                updateData.docketSlip = docketSlipPath;
            }
        } else if (body.action === 'request-cancellation') {
            nextStatus = 'CANCELLATION_REQUESTED';
            const coveringLetterFile = this.getFileForField('stamp_covering_letter', files, body, fileIndexTracker);
            const coveringLetterPath = this.getFilePathFromBody('stamp_covering_letter', body);
            if (coveringLetterFile) {
                updateData.coveringLetter = this.bgFileStoredPath('bg-stamp-covering-letter', coveringLetterFile.filename);
            } else if (coveringLetterPath) {
                updateData.coveringLetter = coveringLetterPath;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            nextStatus = BG_STATUSES.BG_CANCELLATION_CONFIRMED;
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            const cancellConfirmPath = this.getFilePathFromBody('cancell_confirm', body);
            if (cancellConfirmFile) {
                updateData.cancelPdf = this.bgFileStoredPath('bg-cancell-confirm', cancellConfirmFile.filename);
            } else if (cancellConfirmPath) {
                updateData.cancelPdf = cancellConfirmPath;
            }
        } else if (body.action === 'fdr-cancellation-confirmation') {
            nextStatus = BG_STATUSES.FDR_CANCELLED_CONFIRMED;
        }

        const toStatus = nextStatus ?? fromStatus;
        if (nextStatus) updateData.status = nextStatus;

        await this.db
            .update(paymentInstruments)
            .set(updateData)
            .where(eq(paymentInstruments.id, instrumentId));

        // Update instrument_bg_details
        const bgDetailsUpdate: any = {};

        if (body.action === 'accounts-form-1') {
            if (body.approve_bg) bgDetailsUpdate.approveBg = body.approve_bg;

            if (body.bg_req === 'Rejected' && body.reason_req) {
                bgDetailsUpdate.reasonReq = body.reason_req;
                // Send BG rejection email to Tender Executive
                try {
                    await this.paymentRequestsNotificationService.sendBgRejectedEmail(instrumentId);
                } catch (error) {
                    this.logger.error(`BG rejection email failed for instrument ${instrumentId}:`, error);
                }
            }

            if (body.bg_req === 'Accepted') {
                nextStatus = 'ACCOUNTS_FORM_ACCEPTED';
            } else if (body.bg_req === 'Rejected') {
                nextStatus = 'ACCOUNTS_FORM_REJECTED';
            }

            // FDR % agreed at approval time. Accounts Form 1 and Form 3 share the
            // single `fdr_per` column, so a later Form 3 submission overwrites
            // the value captured here.
            if (body.bg_approved_fdr_per) {
                bgDetailsUpdate.fdrPer = Number(body.bg_approved_fdr_per);
            }

            // Bank mail ids / CC -- capture only for now; nothing reads these yet.
            const mailIds = this.parseStringArray(body.bank_mail_ids);
            if (mailIds !== null) bgDetailsUpdate.bankMailIds = mailIds;
            const mailIdsCc = this.parseStringArray(body.bank_mail_ids_cc);
            if (mailIdsCc !== null) bgDetailsUpdate.bankMailIdsCc = mailIdsCc;

            // Handle bg_format_imran file (single file)
            const bgFormatImranFile = this.getFileForField('bg_format_imran', files, body, fileIndexTracker);
            const bgFormatImranPath = this.getFilePathFromBody('bg_format_imran', body);
            if (bgFormatImranFile) {
                bgDetailsUpdate.bgFormatTe = this.bgFileStoredPath('bg-format-imran', bgFormatImranFile.filename);
            } else if (bgFormatImranPath) {
                bgDetailsUpdate.bgFormatTe = bgFormatImranPath;
            }

            // Handle prefilled_signed_bg files (multiple files)
            const prefilledFiles = this.getMultipleFilesForField('prefilled_signed_bg', files, body, fileIndexTracker);
            const prefilledPath = this.getFilePathFromBody('prefilled_signed_bg', body);
            if (prefilledFiles.length > 0) {
                const filePaths = prefilledFiles.map(f => this.bgFileStoredPath('bg-prefilled-signed', f.filename));
                bgDetailsUpdate.prefilledSignedBg = JSON.stringify(filePaths);
            } else if (prefilledPath) {
                // If it's a string path (from FileUploader), parse it if it's JSON array or use as single path
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
                bgDetailsUpdate.sfmsConf = this.bgFileStoredPath('bg-sfms-conf', sfmsConfFile.filename);
            } else if (sfmsConfPath) {
                bgDetailsUpdate.sfmsConf = sfmsConfPath;
            }

            // Handle fdr_copy file
            const fdrCopyFile = this.getFileForField('fdr_copy', files, body, fileIndexTracker);
            const fdrCopyPath = this.getFilePathFromBody('fdr_copy', body);
            if (fdrCopyFile) {
                bgDetailsUpdate.fdrCopy = this.bgFileStoredPath('bg-fdr-copy', fdrCopyFile.filename);
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
                bgDetailsUpdate.extensionLetterPath = this.bgFileStoredPath('bg-ext-letter', extLetterFile.filename);
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
                bgDetailsUpdate.stampCoveringLetter = this.bgFileStoredPath('bg-stamp-covering-letter', coveringLetterFile.filename);
            } else if (coveringLetterPath) {
                bgDetailsUpdate.stampCoveringLetter = coveringLetterPath;
            }
        } else if (body.action === 'bg-cancellation-confirmation') {
            const cancellConfirmFile = this.getFileForField('cancell_confirm', files, body, fileIndexTracker);
            const cancellConfirmPath = this.getFilePathFromBody('cancell_confirm', body);
            if (cancellConfirmFile) {
                bgDetailsUpdate.cancellConfirm = this.bgFileStoredPath('bg-cancell-confirm', cancellConfirmFile.filename);
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

        // NEW: Send BG bank request email to client department after Form 1 data is persisted
        if (body.action === 'accounts-form-1' && body.bg_req === 'Accepted') {
            this.paymentRequestsNotificationService
                .sendBgBankRequestEmail(instrumentId)
                .catch((error) =>
                    this.logger.error(`BG bank request email failed for instrument ${instrumentId}:`, error),
                );
        }

        // NEW: Send BG creation and couriered email after Form 2 data is persisted
        if (body.action === 'accounts-form-2') {
            this.paymentRequestsNotificationService
                .sendBgCreatedCourieredEmail(instrumentId)
                .catch((error) =>
                    this.logger.error(`BG creation couriered email failed for instrument ${instrumentId}:`, error),
                );
        }

        // NEW: Send BG submitted email to client department after Form 3 data is persisted
        if (body.action === 'accounts-form-3') {
            this.paymentRequestsNotificationService
                .sendBgSubmittedEmail(instrumentId)
                .catch((error) =>
                    this.logger.error(`BG submitted email failed for instrument ${instrumentId}:`, error),
                );
        }

        // NEW: Send BG follow-up release email after initiate-followup data is persisted
        if (body.action === 'initiate-followup') {
            // Contacts already parsed earlier in this function (line ~1022)
            const clientContacts = contacts?.filter((c: any) => c?.name && String(c.name).trim().length > 0) || [];
            if (clientContacts.length === 0) {
                this.logger.warn(`No client contacts found for BG follow-up email for instrument ${instrumentId}`);
            } else {
                const clientName = clientContacts[0]?.name || body.organisation_name || 'Client';
                const clientEmails = clientContacts.map((c: any) => c.email || '').filter((e: any) => e && String(e).trim().length > 0);
                if (clientEmails.length === 0) {
                    this.logger.warn(`No client email addresses found for BG follow-up email`);
                } else {
                    await this.paymentRequestsNotificationService.sendBgFollowupReleaseEmail(
                        instrumentId,
                        clientEmails,
                        clientName
                    ).catch((err) =>
                        this.logger.error(`BG follow-up release email failed for instrument ${instrumentId}:`, err)
                    );
                }
            }
        }

        try {
            await this.db.insert(instrumentStatusHistory).values({
                instrumentId,
                fromStatus,
                toStatus,
                fromAction,
                toAction,
                fromStage: 0,
                toStage: 0,
                formData: body,
                remarks: null,
                rejectionReason: body.action === 'accounts-form-1' && body.bg_req === 'Rejected'
                    ? body.reason_req || null
                    : null,
                isResubmission: false,
                previousInstrumentId: null,
                changedBy: user?.id ?? user?.sub ?? 0,
                changedByName: user?.name ?? '',
                changedByRole: String(user?.roleId ?? 0),
                ipAddress: '',
                userAgent: '',
            });
        } catch (error) {
            this.logger.warn(`Status history write failed for BG instrument ${instrumentId}: ${error}`);
        }

        if (body.action === 'initiate-followup') {
            try {
                const mappedContacts = contacts
                    .filter((c: any) => c?.name && String(c.name).trim().length > 0)
                    .map((c: any) => ({
                        name: String(c.name).trim(),
                        email: c.email || null,
                        phone: c.phone || null,
                        org: body.organisation_name || null,
                    }));

                if (mappedContacts.length === 0) {
                    throw new BadRequestException('At least one contact with a name is required');
                }

                const followUpDto: CreateFollowUpDto = {
                    emdId: instrumentId,
                    area: body.area || 'Accounts',
                    partyName: body.organisation_name || 'Unknown',
                    followupFor: 'Bank Guarantee',
                    amount: instrument.amount ? Number(instrument.amount) : 0,
                    contacts: mappedContacts,
                    frequency: body.frequency ? Number(body.frequency) : 1,
                    startFrom: body.followup_start_date || undefined,
                    stopReason: body.stop_reason ? Number(body.stop_reason) : null,
                    proofText: body.proof_text || null,
                    proofImagePath: body.proof_image || null,
                    stopRemarks: body.stop_remarks || null,
                    details: body.emailBody || null,
                    attachments: this.parseStringArray(body.attachments) ?? [],
                    assignedToId: null,
                    createdById: null,
                    followUpHistory: [],
                };

                await this.followUpService.create(followUpDto, user?.id || user?.sub);
            } catch (error) {
                this.logger.warn(`Follow-up creation failed for BG instrument ${instrumentId}: ${error}`);
            }
        }

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
                bgExpiryDate: sql<string | null>`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate})`,
                // Validity / claim expiry are written by Accounts Form 2 to
                // instrument_bg_details (see updateAction), not to payment_instruments.
                validityDate: instrumentBgDetails.validityDate,
                claimExpiryDate: instrumentBgDetails.claimExpiryDate,
                bgClaim: instrumentBgDetails.bgClaim,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                reqNo: paymentInstruments.reqNo,
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
                bankMailIds: instrumentBgDetails.bankMailIds,
                bankMailIdsCc: instrumentBgDetails.bankMailIdsCc,
                bgClientUser: instrumentBgDetails.bgClientUser,
                bgClientCp: instrumentBgDetails.bgClientCp,
                bgClientFin: instrumentBgDetails.bgClientFin,
                bgBankAcc: instrumentBgDetails.bgBankAcc,
                bgBankIfsc: instrumentBgDetails.bgBankIfsc,
                bgBankAccName: instrumentBgDetails.bgBankAccName,
                courierNo: instrumentBgDetails.courierNo,
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
                validityDate: sql<Date | null>`coalesce(${instrumentBgDetails.validityDate}, ${paymentInstruments.validityDate})`,
                claimExpiryDate: sql<Date | null>`coalesce(${instrumentBgDetails.claimExpiryDate}, ${paymentInstruments.claimExpiryDate})`,
                bgClaim: instrumentBgDetails.bgClaim,
                bgExpiryDateBg: sql<string | null>`coalesce(${paymentInstruments.expiryDate}, ${instrumentBgDetails.bgExpiryDate})`,
                docketNo: paymentInstruments.docketNo,
                courierAddress: paymentInstruments.courierAddress,
                courierAddressJson: paymentInstruments.courierAddressJson,
                reqNo: paymentInstruments.reqNo,
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
                requestId: paymentRequests.id,
                requestType: paymentRequests.type,
                requestDueDate: paymentRequests.dueDate,
                requestedByName: users.name,
                requestCreatedAt: paymentRequests.createdAt,
                tenderDueDate: tenderInfos.dueDate,
                tenderStatusName: statuses.name,
                bgNo: instrumentBgDetails.bgNo,
                bgDate: instrumentBgDetails.bgDate,
                beneficiaryName: instrumentBgDetails.beneficiaryName,
                beneficiaryAddress: instrumentBgDetails.beneficiaryAddress,
                bankName: instrumentBgDetails.bankName,
                bgNeeds: instrumentBgDetails.bgNeeds,
                bgPurpose: instrumentBgDetails.bgPurpose,
                bgSoftCopy: instrumentBgDetails.bgSoftCopy,
                bgPo: instrumentBgDetails.bgPo,
                bgClientUser: instrumentBgDetails.bgClientUser,
                bgClientCp: instrumentBgDetails.bgClientCp,
                bgClientFin: instrumentBgDetails.bgClientFin,
                bgBankAcc: instrumentBgDetails.bgBankAcc,
                bgBankIfsc: instrumentBgDetails.bgBankIfsc,
                bgBankAccName: instrumentBgDetails.bgBankAccName,
                bankMailIds: instrumentBgDetails.bankMailIds,
                bankMailIdsCc: instrumentBgDetails.bankMailIdsCc,
                courierNo: instrumentBgDetails.courierNo,
                stampCharges: instrumentBgDetails.stampCharges,
                // Accounts Form 1 (request to bank)
                approveBg: instrumentBgDetails.approveBg,
                reasonReq: instrumentBgDetails.reasonReq,
                prefilledSignedBg: instrumentBgDetails.prefilledSignedBg,
                bgFormatTe: instrumentBgDetails.bgFormatTe,
                bgFormatTl: instrumentBgDetails.bgFormatTl,
                // Accounts Form 2 (after BG creation)
                bg2Remark: instrumentBgDetails.bg2Remark,
                // Accounts Form 3 (capture FDR details)
                fdrPer: instrumentBgDetails.fdrPer,
                fdrCopy: instrumentBgDetails.fdrCopy,
                sfmsConf: instrumentBgDetails.sfmsConf,
                sfmsCharges: instrumentBgDetails.sfmsCharges,
                bgChargeDeducted: instrumentBgDetails.bgChargeDeducted,
                sfmsChargesDeducted: instrumentBgDetails.sfmsChargesDeducted,
                stampChargesDeducted: instrumentBgDetails.stampChargesDeducted,
                otherChargesDeducted: instrumentBgDetails.otherChargesDeducted,
                extendedAmount: instrumentBgDetails.extendedAmount,
                extendedValidityDate: instrumentBgDetails.extendedValidityDate,
                extendedClaimExpiryDate: instrumentBgDetails.extendedClaimExpiryDate,
                extendedBankName: instrumentBgDetails.extendedBankName,
                extensionLetterPath: instrumentBgDetails.extensionLetterPath,
                cancellationLetterPath: instrumentBgDetails.cancellationLetterPath,
                newStampChargeDeducted: instrumentBgDetails.newStampChargeDeducted,
                fdrNo: instrumentBgDetails.fdrNo,
                fdrAmt: instrumentBgDetails.fdrAmt,
                fdrValidity: instrumentBgDetails.fdrValidity,
                fdrRoi: instrumentBgDetails.fdrRoi,
                cancelRemark: instrumentBgDetails.cancelRemark,
                stampCoveringLetter: instrumentBgDetails.stampCoveringLetter,
                cancellConfirm: instrumentBgDetails.cancellConfirm,
                bgFdrCancelDate: instrumentBgDetails.bgFdrCancelDate,
                bgFdrCancelAmount: instrumentBgDetails.bgFdrCancelAmount,
                bgFdrCancelRefNo: instrumentBgDetails.bgFdrCancelRefNo,
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
                eq(paymentInstruments.id, id),
                eq(paymentInstruments.instrumentType, 'BG'),
                eq(paymentInstruments.isActive, true)
            ))
            .limit(1);

        if (!result) {
            throw new NotFoundException(`Payment Instrument with ID ${id} not found`);
        }

        let courierDetails: {
            id: number;
            toOrg: string;
            toName: string;
            toAddr: string;
            toPin: string;
            toMobile: string;
            empFrom: number;
            empFromName: string | null;
            delDate: unknown;
            urgency: number;
            courierDocs: unknown;
            docketNo: string | null;
            docketSlip: string | null;
            status: number | null;
        } | null = null;
        let courierDocs: string[] = [];
        if (result.reqNo) {
            const courierId = Number(result.reqNo);
            if (!isNaN(courierId)) {
                const [courier] = await this.db
                    .select()
                    .from(couriers)
                    .where(eq(couriers.id, courierId))
                    .limit(1);
                if (courier) {
                    let empFromName: string | null = null;
                    if (courier.empFrom) {
                        const [sender] = await this.db
                            .select({ name: users.name })
                            .from(users)
                            .where(eq(users.id, courier.empFrom))
                            .limit(1);
                        empFromName = sender?.name ?? null;
                    }
                    courierDetails = {
                        id: courier.id,
                        toOrg: courier.toOrg,
                        toName: courier.toName,
                        toAddr: courier.toAddr,
                        toPin: courier.toPin,
                        toMobile: courier.toMobile,
                        empFrom: courier.empFrom,
                        empFromName,
                        delDate: courier.delDate,
                        urgency: courier.urgency,
                        courierDocs: courier.courierDocs,
                        docketNo: courier.docketNo,
                        docketSlip: courier.docketSlip,
                        status: courier.status,
                    };
                }
            }
        }

        // Documents uploaded with the Accounts Form 2 courier dispatch live in
        // payment_instruments.courier_address_json; the shared couriers row is
        // only a fallback for older records.
        const rawJson = result.courierAddressJson;
        const jsonDocs = rawJson !== null && typeof rawJson === 'object' && 'docs' in rawJson
            ? (rawJson as { docs?: unknown }).docs
            : undefined;
        const fallbackDocs = this.parseStringArray(
            courierDetails?.courierDocs ?? null
        );
        courierDocs = Array.isArray(jsonDocs) && jsonDocs.length > 0
            ? jsonDocs.filter((d): d is string => typeof d === 'string')
            : (fallbackDocs ?? []);

        const currentStep = Number(result.action ?? 0);
        const hasAccountsForm1Data = currentStep >= 1;
        const hasAccountsForm2Data = currentStep >= 2;
        const hasAccountsForm3Data = currentStep >= 3;
        const hasExtensionData = !!(result.extendedAmount || result.extendedValidityDate
            || result.extendedClaimExpiryDate || result.extendedBankName
            || result.newStampChargeDeducted) || this.hasFileValue(result.extensionLetterPath);
        const hasExtensionModification = !!(result.extendedAmount || result.extendedValidityDate
            || result.extendedClaimExpiryDate || result.extendedBankName || result.newStampChargeDeducted);
        const hasReturnedData = !!(result.docketNo || result.courierNo)
            || this.hasFileValue(result.docketSlip);
        const hasRequestCancellationData = !!(result.coveringLetter || result.cancelRemark)
            || this.hasFileValue(result.stampCoveringLetter)
            || this.hasFileValue(result.cancellationLetterPath);
        const hasBgCancellationData = this.hasFileValue(result.cancellConfirm);
        const hasFdrCancellationData = !!(result.bgFdrCancelDate || result.bgFdrCancelAmount);

        return {
            id: result.id,
            action: result.action,
            status: result.status,
            bgStatus: this.statusMap()[result.status] || result.status,
            tenderNo: result.tenderNo,
            tenderName: result.tenderName,
            tenderId: result.tenderId,
            requestId: result.requestId,
            requestType: result.requestType,
            requestDueDate: result.requestDueDate ? new Date(result.requestDueDate) : null,
            requestedByName: result.requestedByName,
            tenderDueDate: result.tenderDueDate ? new Date(result.tenderDueDate) : null,
            tenderStatusName: result.tenderStatusName,
            requestCreatedAt: result.requestCreatedAt ? result.requestCreatedAt.toISOString() : null,
            amount: result.amount ? Number(result.amount) : null,
            favouring: result.favouring,
            payableAt: result.payableAt,
            issueDate: result.issueDate ? new Date(result.issueDate) : null,
            expiryDate: result.expiryDate ? new Date(result.expiryDate) : null,
            validityDate: result.validityDate ? new Date(result.validityDate) : null,
            claimExpiryDate: result.claimExpiryDate ? new Date(result.claimExpiryDate) : null,
            claimExpiryDateBg: result.claimExpiryDate ? new Date(result.claimExpiryDate) : null,
            bgExpiryDate: result.bgExpiryDateBg ? new Date(result.bgExpiryDateBg) : null,
            bgClaim: result.bgClaim ? new Date(result.bgClaim) : null,
            bgNo: result.bgNo,
            bgDate: result.bgDate ? new Date(result.bgDate) : null,
            beneficiaryName: result.beneficiaryName,
            beneficiaryAddress: result.beneficiaryAddress,
            bankName: result.bankName,
            bgNeeds: result.bgNeeds,
            bgPurpose: result.bgPurpose,
            bgSoftCopy: result.bgSoftCopy,
            bgPo: result.bgPo,
            bgClientUser: result.bgClientUser,
            bgClientCp: result.bgClientCp,
            bgClientFin: result.bgClientFin,
            bgBankAcc: result.bgBankAcc,
            bgBankIfsc: result.bgBankIfsc,
            bgBankAccName: result.bgBankAccName,
            bankMailIds: result.bankMailIds ?? [],
            bankMailIdsCc: result.bankMailIdsCc ?? [],
            courierNo: result.courierNo,
            courierAddress: result.courierAddress,
            courierAddressJson: (result.courierAddressJson ?? null) as Record<string, any> | null,
            courierDocs,
            reqNo: result.reqNo,
            courierDetails,
            courierDeadline: result.courierDeadline ? Number(result.courierDeadline) : null,
            stampCharges: result.stampCharges ? Number(result.stampCharges) : null,
            sfmsCharges: result.sfmsCharges ? Number(result.sfmsCharges) : null,
            // Accounts Form 1 (request to bank)
            approveBg: result.approveBg,
            reasonReq: result.reasonReq,
            prefilledSignedBg: result.prefilledSignedBg,
            bgFormatTe: result.bgFormatTe,
            bgFormatTl: result.bgFormatTl,
            // Accounts Form 2 (after BG creation)
            bg2Remark: result.bg2Remark,
            // Accounts Form 3 (capture FDR details). fdrPer is returned as a
            // string because the form field is z.enum(['10','15','100']) and the
            // SelectField emits strings for it.
            fdrPer: result.fdrPer != null ? String(result.fdrPer) : null,
            fdrCopy: result.fdrCopy,
            sfmsConf: result.sfmsConf,
            bgChargeDeducted: result.bgChargeDeducted ? Number(result.bgChargeDeducted) : null,
            sfmsChargesDeducted: result.sfmsChargesDeducted ? Number(result.sfmsChargesDeducted) : null,
            stampChargesDeducted: result.stampChargesDeducted ? Number(result.stampChargesDeducted) : null,
            otherChargesDeducted: result.otherChargesDeducted ? Number(result.otherChargesDeducted) : null,
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
            extensionLetterPath: result.extensionLetterPath,
            cancellationLetterPath: result.cancellationLetterPath,
            newStampChargeDeducted: result.newStampChargeDeducted ? Number(result.newStampChargeDeducted) : null,
            fdrNo: result.fdrNo,
            fdrAmt: result.fdrAmt ? Number(result.fdrAmt) : null,
            fdrValidity: result.fdrValidity ? new Date(result.fdrValidity) : null,
            fdrRoi: result.fdrRoi ? Number(result.fdrRoi) : null,
            cancelRemark: result.cancelRemark,
            stampCoveringLetter: result.stampCoveringLetter,
            cancellConfirm: result.cancellConfirm,
            bgFdrCancelDate: result.bgFdrCancelDate,
            bgFdrCancelAmount: result.bgFdrCancelAmount ? Number(result.bgFdrCancelAmount) : null,
            bgFdrCancelRefNo: result.bgFdrCancelRefNo,
            hasAccountsForm1Data,
            hasAccountsForm2Data,
            hasAccountsForm3Data,
            hasExtensionData,
            hasExtensionModification,
            hasReturnedData,
            hasRequestCancellationData,
            hasBgCancellationData,
            hasFdrCancellationData,
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
                frequency: followUps.frequency,
                startFrom: followUps.startFrom,
                nextFollowUpDate: followUps.nextFollowUpDate,
                stopReason: followUps.stopReason,
                proofText: followUps.proofText,
                stopRemarks: followUps.stopRemarks,
                proofImagePath: followUps.proofImagePath,
                attachments: followUps.attachments,
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

        const contactRows = await this.db
            .select({
                name: followUpPersons.name,
                email: followUpPersons.email,
                phone: followUpPersons.phone,
                organisation: followUpPersons.organization,
            })
            .from(followUpPersons)
            .where(eq(followUpPersons.followUpId, result.id))
            .orderBy(asc(followUpPersons.createdAt));

        return {
            id: result.id,
            organisationName: result.partyName,
            area: result.area,
            amount: result.amount ? Number(result.amount) : null,
            contacts: contactRows.map((contact) => ({
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                org: contact.organisation,
            })),
            frequency: result.frequency,
            followupStartDate: result.startFrom ? new Date(result.startFrom) : null,
            nextFollowUpDate: result.nextFollowUpDate ? new Date(result.nextFollowUpDate) : null,
            stopReason: result.stopReason,
            proofText: result.proofText,
            stopRemarks: result.stopRemarks,
            proofImagePath: result.proofImagePath,
            attachments: result.attachments || [],
            assignmentStatus: result.assignmentStatus,
            createdAt: result.createdAt,
        };
    }
}
