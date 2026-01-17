import {
    Inject,
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray, or, gt, asc, desc, isNull, sql, ne, notInArray, isNotNull, not } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentTransferDetails,
    type PaymentRequest,
    type PaymentInstrument,
} from '@db/schemas/tendering/emds.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { tenderInformation } from '@db/schemas/tendering/tender-info-sheet.schema';
import { users } from '@db/schemas/auth/users.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { InstrumentStatusService } from '@/modules/tendering/emds/services/instrument-status.service';
import { InstrumentStatusHistoryService } from '@/modules/tendering/emds/services/instrument-status-history.service';
import { TenderStatusHistoryService } from '@/modules/tendering/tender-status-history/tender-status-history.service';
import { wrapPaginatedResponse } from '@/utils/responseWrapper';
import { StatusCache } from '@/utils/status-cache';
import type {
    CreatePaymentRequestDto,
    UpdatePaymentRequestDto,
    UpdateStatusDto,
    PaymentPurpose,
    InstrumentType,
} from '@/modules/tendering/emds/dto/emds.dto';
import {
    DD_STATUSES,
    FDR_STATUSES,
    BG_STATUSES,
    CHEQUE_STATUSES,
    BT_STATUSES,
    PORTAL_STATUSES,
} from '@/modules/tendering/emds/constants/emd-statuses';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';

export interface PendingTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string | null;
    status: number;
    statusName: string | null;
    dueDate: Date | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    emd: string | null;
    emdMode: string | null;
    tenderFee: string | null;
    tenderFeeMode: string | null;
    processingFee: string | null;
    processingFeeMode: string | null;
}

export interface PaymentRequestRow {
    id: number;
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    purpose: PaymentPurpose;
    amountRequired: string;
    dueDate: Date | null;
    teamMemberId: number | null;
    teamMemberName: string | null;
    instrumentId: number | null;
    instrumentType: InstrumentType | null;
    instrumentStatus: string | null;
    displayStatus: string;
    createdAt: Date | null;
}

export interface DashboardCounts {
    pending: number;
    sent: number;
    approved: number;
    rejected: number;
    returned: number;
    tenderDnb: number;
    total: number;
}

export interface PendingTabResponse {
    data: PendingTenderRow[];
    counts: DashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface RequestTabResponse {
    data: PaymentRequestRow[];
    counts: DashboardCounts;
    meta?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type DashboardTab = 'pending' | 'sent' | 'approved' | 'rejected' | 'returned' | 'tender-dnb';

const APPROVED_STATUSES = [
    DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BG_STATUSES.BANK_REQUEST_ACCEPTED,
    CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BT_STATUSES.SETTLED_WITH_PROJECT,
    PORTAL_STATUSES.SETTLED_WITH_PROJECT,
    BG_STATUSES.BG_CREATED,
    BG_STATUSES.FDR_CAPTURED,
    BG_STATUSES.FOLLOWUP_INITIATED,
    BG_STATUSES.EXTENSION_REQUESTED,
    BG_STATUSES.COURIER_RETURN_RECEIVED,
    BG_STATUSES.CANCELLATION_REQUESTED,
    BG_STATUSES.BG_CANCELLATION_CONFIRMED,
    BG_STATUSES.FDR_CANCELLATION_CONFIRMED,
];

const RETURNED_STATUSES = [
    DD_STATUSES.COURIER_RETURN_RECEIVED,
    FDR_STATUSES.COURIER_RETURN_RECEIVED,
    BG_STATUSES.COURIER_RETURN_RECEIVED,
    DD_STATUSES.BANK_RETURN_COMPLETED,
    FDR_STATUSES.BANK_RETURN_COMPLETED,
    BT_STATUSES.RETURN_VIA_BANK_TRANSFER,
    PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER,
    DD_STATUSES.CANCELLED_AT_BRANCH,
    FDR_STATUSES.CANCELLED_AT_BRANCH,
    BG_STATUSES.BG_CANCELLATION_CONFIRMED,
    BG_STATUSES.FDR_CANCELLATION_CONFIRMED,
    CHEQUE_STATUSES.CANCELLED_TORN,
    DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
    FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
];

const REJECTED_STATUS_PATTERN = '_REJECTED';

const mapInstrumentType = (mode: string): InstrumentType => {
    const mapping: Record<string, InstrumentType> = {
        DD: 'DD',
        FDR: 'FDR',
        BG: 'BG',
        CHEQUE: 'Cheque',
        BANK_TRANSFER: 'Bank Transfer',
        BT: 'Bank Transfer',  // Frontend short code
        PORTAL: 'Portal Payment',
        POP: 'Portal Payment',  // Frontend short code
    };
    return mapping[mode] || 'DD';
};

const getInitialInstrumentStatus = (instrumentType: InstrumentType): string => {
    switch (instrumentType) {
        case 'DD':
            return DD_STATUSES.PENDING;
        case 'FDR':
            return FDR_STATUSES.PENDING;
        case 'BG':
            return BG_STATUSES.PENDING;
        case 'Cheque':
            return CHEQUE_STATUSES.PENDING;
        case 'Bank Transfer':
            return BT_STATUSES.PENDING;
        case 'Portal Payment':
            return PORTAL_STATUSES.PENDING;
        default:
            return 'PENDING';
    }
};

const deriveDisplayStatus = (instrumentStatus: string | null): string => {
    if (!instrumentStatus) return 'Pending';

    if (instrumentStatus.includes(REJECTED_STATUS_PATTERN)) return 'Rejected';
    if (RETURNED_STATUSES.includes(instrumentStatus as any)) return 'Returned';
    if (APPROVED_STATUSES.includes(instrumentStatus as any)) return 'Approved';

    return 'Sent';
};

const getDisplayTab = (instrumentStatus: string | null): DashboardTab => {
    if (!instrumentStatus) return 'sent';

    if (instrumentStatus.includes(REJECTED_STATUS_PATTERN)) return 'rejected';
    if (RETURNED_STATUSES.includes(instrumentStatus as any)) return 'returned';
    if (APPROVED_STATUSES.includes(instrumentStatus as any)) return 'approved';

    return 'sent';
};

@Injectable()
export class EmdsService {
    private readonly logger = new Logger(EmdsService.name);

    constructor(
        @Inject(DRIZZLE) private readonly db: DbInstance,
        private readonly tenderInfosService: TenderInfosService,
        private readonly instrumentStatusService: InstrumentStatusService,
        private readonly historyService: InstrumentStatusHistoryService,
        private readonly tenderStatusHistoryService: TenderStatusHistoryService,
        private readonly emailService: EmailService,
        private readonly recipientResolver: RecipientResolver,
    ) { }

    /**
     * Get dashboard data based on tab
     */
    async getDashboardData(
        tab: DashboardTab = 'pending',
        userId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' }
    ): Promise<PendingTabResponse | RequestTabResponse> {
        const counts = await this.getDashboardCounts(userId);

        if (tab === 'pending') return this.getPendingTenders(userId, pagination, sort, counts);
        if (tab === 'tender-dnb') return this.getTenderDnbTenders(userId, pagination, sort, counts);

        return this.getPaymentRequestsByTab(tab, userId, pagination, sort, counts);
    }

    /**
     * Get counts for all tabs
     */
    async getDashboardCounts(userId?: number): Promise<DashboardCounts> {
        // STRICT: Only show active, approved, valid tenders for "To Do"
        const pendingCount = await this.countPendingTenders(userId);

        // PERMISSIVE: Show ALL active instruments regardless of Tender state
        const requestCounts = await this.countRequestsByStatus(userId);

        // STRICT: Only DNB
        const tenderDnbCount = await this.countTenderDnb(userId);

        return {
            pending: pendingCount,
            sent: requestCounts.sent,
            approved: requestCounts.approved,
            rejected: requestCounts.rejected,
            returned: requestCounts.returned,
            tenderDnb: tenderDnbCount,
            total: pendingCount + requestCounts.sent + requestCounts.approved + requestCounts.rejected + requestCounts.returned + tenderDnbCount,
        };
    }

    /**
     * Single source of truth for Tab Status logic
     */
    private getTabSqlCondition(tab: DashboardTab) {
        // Status matching logic
        const isRejected = sql`${paymentInstruments.status} LIKE ${'%' + REJECTED_STATUS_PATTERN}`;
        const isReturned = inArray(paymentInstruments.status, RETURNED_STATUSES);
        const isApproved = inArray(paymentInstruments.status, APPROVED_STATUSES);

        // Sent = NULL or (Not Rejected AND Not Returned AND Not Approved)
        const isSent = or(
            isNull(paymentInstruments.status),
            and(not(isRejected), not(isReturned), not(isApproved))
        );

        switch (tab) {
            case 'rejected': return isRejected;
            case 'returned': return isReturned;
            case 'approved': return isApproved;
            case 'sent': return isSent;
            default: return isSent;
        }
    }

    /**
     * Optimized Count Query (Matches Database "True" Count)
     */
    private async countRequestsByStatus(userId?: number): Promise<{ sent: number; approved: number; rejected: number; returned: number; }> {
        const userCondition = userId
            ? or(eq(tenderInfos.teamMember, userId), eq(paymentRequests.requestedBy, userId.toString()))
            : undefined;

        // Uses SQL Aggregation for performance
        // NOTE: We do NOT filter by tenderInfos.deleteStatus or tlStatus here.
        // If a request exists and instrument is active, we count it.
        const [result] = await this.db
            .select({
                sent: sql<number>`COALESCE(SUM(CASE WHEN ${this.getTabSqlCondition('sent')} THEN 1 ELSE 0 END), 0)`,
                approved: sql<number>`COALESCE(SUM(CASE WHEN ${this.getTabSqlCondition('approved')} THEN 1 ELSE 0 END), 0)`,
                rejected: sql<number>`COALESCE(SUM(CASE WHEN ${this.getTabSqlCondition('rejected')} THEN 1 ELSE 0 END), 0)`,
                returned: sql<number>`COALESCE(SUM(CASE WHEN ${this.getTabSqlCondition('returned')} THEN 1 ELSE 0 END), 0)`,
            })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .where(and(
                or(eq(paymentRequests.tenderId, 0), isNotNull(tenderInfos.id)),
                userCondition
            ));

        return {
            sent: Number(result?.sent || 0),
            approved: Number(result?.approved || 0),
            rejected: Number(result?.rejected || 0),
            returned: Number(result?.returned || 0),
        };
    }

    /**
     * Optimized List Query (Shows Ghost/Messy Records)
     */
    private async getPaymentRequestsByTab(
        tab: DashboardTab,
        userId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts
    ): Promise<RequestTabResponse> {
        const userCondition = userId
            ? or(eq(tenderInfos.teamMember, userId), eq(paymentRequests.requestedBy, userId.toString()))
            : undefined;

        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        // Sorting Logic
        let orderClause: any = asc(tenderInfos.dueDate);
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo': orderClause = direction(tenderInfos.tenderNo); break;
                case 'tenderName': orderClause = direction(tenderInfos.tenderName); break;
                case 'dueDate': orderClause = direction(tenderInfos.dueDate); break;
                case 'amountRequired': orderClause = direction(paymentRequests.amountRequired); break;
                case 'purpose': orderClause = direction(paymentRequests.purpose); break;
                default: orderClause = asc(tenderInfos.dueDate);
            }
        }

        // Shared Where Clause
        // Critical: This matches countRequestsByStatus exactly
        const whereClause = and(
            this.getTabSqlCondition(tab), // Use helper
            eq(paymentInstruments.isActive, true),
            or(eq(paymentRequests.tenderId, 0), isNotNull(tenderInfos.id)),
            userCondition
        );

        // Get Total for Pagination
        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .where(whereClause);

        // Get Data
        const rows = await this.db
            .select({
                id: paymentRequests.id,
                tenderId: paymentRequests.tenderId,
                tenderNo: sql<string>`COALESCE(${tenderInfos.tenderNo}, ${paymentRequests.tenderNo})`.as('tenderNo'),
                // Fallback for name to show users what this is
                tenderName: sql<string>`COALESCE(${tenderInfos.tenderName}, ${paymentRequests.projectName}, 'N/A')`.as('tenderName'),
                purpose: paymentRequests.purpose,
                amountRequired: paymentRequests.amountRequired,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMemberName: users.name,
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                instrumentStatus: paymentInstruments.status,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        // Map response
        const data: PaymentRequestRow[] = rows.map((row) => ({
            id: row.id,
            tenderId: row.tenderId,
            tenderNo: row.tenderNo || '',
            tenderName: row.tenderName || '',
            purpose: row.purpose as PaymentPurpose,
            amountRequired: row.amountRequired || '0',
            dueDate: row.dueDate,
            teamMemberId: row.teamMemberId,
            teamMemberName: row.teamMemberName,
            instrumentId: row.instrumentId,
            instrumentType: row.instrumentType as InstrumentType | null,
            instrumentStatus: row.instrumentStatus,
            displayStatus: deriveDisplayStatus(row.instrumentStatus),
            createdAt: row.createdAt,
        }));

        return {
            ...wrapPaginatedResponse(data, Number(countResult?.count || 0), page, limit),
            counts: counts || await this.getDashboardCounts(userId),
        };
    }

    /**
     * Count pending tenders (tenders with requirements but no payment requests)
     */
    private async countPendingTenders(userId?: number): Promise<number> {
        const userCondition = userId ? eq(tenderInfos.teamMember, userId) : undefined;

        // Subquery: tenders that have payment requests
        const tendersWithRequests = this.db
            .select({ tenderId: paymentRequests.tenderId })
            .from(paymentRequests)
            .groupBy(paymentRequests.tenderId);

        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    or(
                        eq(tenderInformation.emdRequired, 'Yes'),
                        eq(tenderInformation.tenderFeeRequired, 'Yes'),
                        eq(tenderInformation.processingFeeRequired, 'Yes')
                    ),
                    or(
                        gt(tenderInfos.emd, sql`0`),
                        gt(tenderInfos.tenderFees, sql`0`),
                        gt(tenderInformation.processingFeeAmount, sql`0`)
                    ),
                    // No payment request exists
                    sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
                    userCondition
                )
            );

        return Number(result?.count || 0);
    }

    /**
     * Get pending tenders (1 row per tender)
     */
    private async getPendingTenders(
        userId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts
    ): Promise<PendingTabResponse> {
        const userCondition = userId ? eq(tenderInfos.teamMember, userId) : undefined;
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        // Build order clause
        let orderClause: any = asc(tenderInfos.dueDate);
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderClause = direction(tenderInfos.tenderName);
                    break;
                case 'dueDate':
                    orderClause = direction(tenderInfos.dueDate);
                    break;
                case 'teamMemberName':
                    orderClause = direction(users.name);
                    break;
                case 'emdRequired':
                    orderClause = direction(tenderInfos.emd);
                    break;
                default:
                    orderClause = asc(tenderInfos.dueDate);
            }
        }

        // Get total count
        const totalCount = counts?.pending ?? await this.countPendingTenders(userId);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMemberName: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                processingFee: tenderInformation.processingFeeAmount,
                processingFeeMode: tenderInformation.processingFeeMode,
                status: tenderInfos.status,
                statusName: statuses.name,
                gstValues: tenderInfos.gstValues,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    TenderInfosService.getExcludeStatusCondition(['dnb', 'lost']),
                    or(
                        eq(tenderInformation.emdRequired, 'Yes'),
                        eq(tenderInformation.tenderFeeRequired, 'Yes'),
                        eq(tenderInformation.processingFeeRequired, 'Yes')
                    ),
                    or(
                        gt(tenderInfos.emd, sql`0`),
                        gt(tenderInfos.tenderFees, sql`0`),
                        gt(tenderInformation.processingFeeAmount, sql`0`)
                    ),
                    sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
                    userCondition
                )
            )
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const wrapped = wrapPaginatedResponse(rows as PendingTenderRow[], totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(userId),
        };
    }

    /**
     * Count tender-dnb tenders
     */
    private async countTenderDnb(userId?: number): Promise<number> {
        const userCondition = userId ? eq(tenderInfos.teamMember, userId) : undefined;
        const dnbStatusIds = StatusCache.getIds('dnb');

        const [result] = await this.db
            .select({ count: sql<number>`count(distinct ${tenderInfos.id})` })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    inArray(tenderInfos.status, dnbStatusIds),
                    or(
                        eq(tenderInformation.emdRequired, 'Yes'),
                        eq(tenderInformation.tenderFeeRequired, 'Yes'),
                        eq(tenderInformation.processingFeeRequired, 'Yes')
                    ),
                    userCondition
                )
            );

        return Number(result?.count || 0);
    }

    /**
     * Get tender-dnb tenders (1 row per tender)
     */
    private async getTenderDnbTenders(
        userId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts
    ): Promise<PendingTabResponse> {
        const userCondition = userId ? eq(tenderInfos.teamMember, userId) : undefined;
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;
        const dnbStatusIds = StatusCache.getIds('dnb');

        // Build order clause (same as getPendingTenders)
        let orderClause: any = asc(tenderInfos.dueDate);
        if (sort?.sortBy) {
            const direction = sort.sortOrder === 'desc' ? desc : asc;
            switch (sort.sortBy) {
                case 'tenderNo':
                    orderClause = direction(tenderInfos.tenderNo);
                    break;
                case 'tenderName':
                    orderClause = direction(tenderInfos.tenderName);
                    break;
                case 'dueDate':
                    orderClause = direction(tenderInfos.dueDate);
                    break;
                case 'teamMemberName':
                    orderClause = direction(users.name);
                    break;
                case 'emdRequired':
                    orderClause = direction(tenderInfos.emd);
                    break;
                default:
                    orderClause = asc(tenderInfos.dueDate);
            }
        }

        // Get total count
        const totalCount = counts?.tenderDnb ?? await this.countTenderDnb(userId);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMemberName: users.name,
                emd: tenderInfos.emd,
                emdMode: tenderInfos.emdMode,
                tenderFee: tenderInfos.tenderFees,
                tenderFeeMode: tenderInfos.tenderFeeMode,
                processingFee: tenderInformation.processingFeeAmount,
                processingFeeMode: tenderInformation.processingFeeMode,
                status: tenderInfos.status,
                statusName: statuses.name,
                gstValues: tenderInfos.gstValues,
            })
            .from(tenderInfos)
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, tenderInfos.teamMember))
            .leftJoin(statuses, eq(statuses.id, tenderInfos.status))
            .where(
                and(
                    TenderInfosService.getActiveCondition(),
                    TenderInfosService.getApprovedCondition(),
                    inArray(tenderInfos.status, dnbStatusIds),
                    or(
                        eq(tenderInformation.emdRequired, 'Yes'),
                        eq(tenderInformation.tenderFeeRequired, 'Yes'),
                        eq(tenderInformation.processingFeeRequired, 'Yes')
                    ),
                    userCondition
                )
            )
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const wrapped = wrapPaginatedResponse(rows as PendingTenderRow[], totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(userId),
        };
    }

    async create(
        tenderId: number,
        payload: CreatePaymentRequestDto,
        userId?: number
    ) {
        const tender = await this.tenderInfosService.getTenderForPayment(tenderId);

        // Get current tender status before update
        const currentTender = await this.tenderInfosService.findById(tenderId);
        const prevStatus = currentTender?.status ?? null;

        const [infoSheet] = await this.db
            .select()
            .from(tenderInformation)
            .where(eq(tenderInformation.tenderId, tenderId))
            .limit(1);

        const createdRequests: PaymentRequest[] = [];
        const createdInstruments: Array<{ requestId: number; instrumentId: number; mode: string; purpose: PaymentPurpose; amount: number; details: any }> = [];
        let emdRequested = false;

        await this.db.transaction(async (tx) => {
            // Create EMD request if mode is provided
            if (payload.emd?.mode && payload.emd?.details) {
                const emdAmount = Number(tender.emd) || 0;
                if (emdAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'EMD',
                        emdAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);
                    emdRequested = true;

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.emd.mode,
                        payload.emd.details,
                        emdAmount,
                        userId
                    );
                    createdInstruments.push({
                        requestId: request.id,
                        instrumentId: instrument.id,
                        mode: payload.emd.mode,
                        purpose: 'EMD',
                        amount: emdAmount,
                        details: payload.emd.details,
                    });
                }
            }

            // Create Tender Fee request if mode is provided
            if (payload.tenderFee?.mode && payload.tenderFee?.details) {
                const tenderFeeAmount = Number(tender.tenderFees) || 0;
                if (tenderFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Tender Fee',
                        tenderFeeAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.tenderFee.mode,
                        payload.tenderFee.details,
                        tenderFeeAmount,
                        userId
                    );
                    createdInstruments.push({
                        requestId: request.id,
                        instrumentId: instrument.id,
                        mode: payload.tenderFee.mode,
                        purpose: 'Tender Fee',
                        amount: tenderFeeAmount,
                        details: payload.tenderFee.details,
                    });
                }
            }

            // Create Processing Fee request if mode is provided
            if (
                payload.processingFee?.mode &&
                payload.processingFee?.details &&
                infoSheet
            ) {
                const processingFeeAmount = infoSheet.processingFeeAmount
                    ? Number(infoSheet.processingFeeAmount)
                    : 0;
                if (processingFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Processing Fee',
                        processingFeeAmount,
                        tender,
                        userId
                    );
                    createdRequests.push(request);

                    const instrument = await this.createInstrumentWithDetails(
                        tx,
                        request.id,
                        payload.processingFee.mode,
                        payload.processingFee.details,
                        processingFeeAmount,
                        userId
                    );
                    createdInstruments.push({
                        requestId: request.id,
                        instrumentId: instrument.id,
                        mode: payload.processingFee.mode,
                        purpose: 'Processing Fee',
                        amount: processingFeeAmount,
                        details: payload.processingFee.details,
                    });
                }
            }

            // AUTO STATUS CHANGE: Update tender status to 5 (EMD Requested) if EMD was requested
            if (emdRequested && userId) {
                const newStatus = 5; // Status ID for "EMD Requested"
                await tx
                    .update(tenderInfos)
                    .set({ status: newStatus, updatedAt: new Date() })
                    .where(eq(tenderInfos.id, tenderId));

                await this.tenderStatusHistoryService.trackStatusChange(
                    tenderId,
                    newStatus,
                    userId,
                    prevStatus,
                    'EMD requested',
                    tx
                );
            }
        });

        // Send email notifications for each created instrument
        for (const instrumentInfo of createdInstruments) {
            await this.sendPaymentRequestEmail(tenderId, instrumentInfo, tender, userId || 0);
        }

        return createdRequests;
    }

    private async createPaymentRequest(
        tx: DbInstance,
        tenderId: number,
        purpose: PaymentPurpose,
        amount: number,
        tender: any,
        userId?: number
    ): Promise<PaymentRequest> {
        const [request] = await tx
            .insert(paymentRequests)
            .values({
                tenderId,
                purpose,
                amountRequired: amount.toString(),
                dueDate: tender.dueDate,
                tenderNo: tender.tenderNo,
                status: 'Pending',
                requestedBy: userId?.toString() || null,
            })
            .returning();

        return request;
    }

    private async createInstrumentWithDetails(
        tx: DbInstance,
        requestId: number,
        mode: string,
        details: any,
        amount: number,
        userId?: number
    ): Promise<PaymentInstrument> {
        const instrumentType = mapInstrumentType(mode);
        const initialStatus = getInitialInstrumentStatus(instrumentType);

        const instrumentData: any = {
            requestId,
            instrumentType,
            amount: amount.toString(),
            status: initialStatus,
            action: 1,
            currentStage: 1,
            isActive: true,
        };

        // Map common fields based on mode
        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours
                ? parseInt(details.ddCourierHours)
                : null;
            instrumentData.issueDate = details.ddDate
                ? new Date(details.ddDate).toISOString().split('T')[0]
                : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate
                ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.fdrCourierAddress;
            instrumentData.courierDeadline = details.fdrCourierHours
                ? parseInt(details.fdrCourierHours)
                : null;
            instrumentData.issueDate = details.fdrDate
                ? new Date(details.fdrDate).toISOString().split('T')[0]
                : null;
        } else if (mode === 'BG' && details.bgFavouring) {
            instrumentData.favouring = details.bgFavouring;
            instrumentData.expiryDate = details.bgExpiryDate
                ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.claimExpiryDate = details.bgClaimPeriod
                ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.bgCourierAddress;
            instrumentData.courierDeadline = details.bgCourierDays || null;
        } else if ((mode === 'BANK_TRANSFER' || mode === 'BT') && details.btAccountName) {
            // Bank transfer specific fields are in detail table
        } else if ((mode === 'PORTAL' || mode === 'POP') && details.portalName) {
            // Portal specific fields are in detail table
        }

        const [instrument] = await tx
            .insert(paymentInstruments)
            .values(instrumentData)
            .returning();

        // Create detail record
        await this.createInstrumentDetails(tx, instrument.id, mode, details);

        // Record initial status in history
        await this.historyService.recordStatusChange(
            instrument.id,
            null,
            initialStatus,
            instrumentType,
            {
                userId,
                remarks: 'Initial creation',
                formData: details,
            }
        );

        return instrument;
    }

    private async createInstrumentDetails(
        tx: DbInstance,
        instrumentId: number,
        mode: string,
        details: any
    ) {
        if (mode === 'DD' || mode === 'CHEQUE') {
            await tx.insert(instrumentDdDetails).values({
                instrumentId,
                ddDate: details.ddDate
                    ? new Date(details.ddDate).toISOString().split('T')[0]
                    : null,
                ddPurpose: details.ddPurpose,
                ddNeeds: details.ddDeliverBy,
                ddRemarks: details.ddRemarks,
            });
        } else if (mode === 'FDR') {
            await tx.insert(instrumentFdrDetails).values({
                instrumentId,
                fdrDate: details.fdrDate
                    ? new Date(details.fdrDate).toISOString().split('T')[0]
                    : null,
                fdrExpiryDate: details.fdrExpiryDate
                    ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                    : null,
                fdrPurpose: details.fdrPurpose,
                fdrNeeds: details.fdrDeliverBy,
            });
        } else if (mode === 'BG') {
            await tx.insert(instrumentBgDetails).values({
                instrumentId,
                bgDate: details.bgExpiryDate
                    ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                    : null,
                validityDate: details.bgExpiryDate
                    ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                    : null,
                claimExpiryDate: details.bgClaimPeriod
                    ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                    : null,
                beneficiaryName: details.bgFavouring,
                beneficiaryAddress: details.bgAddress,
                bankName: details.bgBank,
                stampCharges: details.bgStampValue?.toString() || null,
                bgNeeds: details.bgNeededIn,
                bgPurpose: details.bgPurpose,
                bgClientUser: details.bgClientUserEmail,
                bgClientCp: details.bgClientCpEmail,
                bgClientFin: details.bgClientFinanceEmail,
            });
        } else if (mode === 'BANK_TRANSFER' || mode === 'BT') {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                accountName: details.btAccountName,
                accountNumber: details.btAccountNo,
                ifsc: details.btIfsc,
            });
        } else if (mode === 'PORTAL' || mode === 'POP') {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                portalName: details.portalName,
                paymentMethod:
                    details.portalNetBanking === 'YES'
                        ? 'Netbanking'
                        : details.portalDebitCard === 'YES'
                            ? 'Debit Card'
                            : null,
                isNetbanking: details.portalNetBanking,
                isDebit: details.portalDebitCard,
            });
        }
    }

    async findByTenderId(tenderId: number) {
        await this.tenderInfosService.validateExists(tenderId);

        const requests = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.tenderId, tenderId))
            .orderBy(paymentRequests.createdAt);

        const requestsWithInstruments = await Promise.all(
            requests.map(async (request) => {
                const instruments = await this.db
                    .select()
                    .from(paymentInstruments)
                    .where(
                        and(
                            eq(paymentInstruments.requestId, request.id),
                            eq(paymentInstruments.isActive, true)
                        )
                    );

                const instrumentsWithDetails = await Promise.all(
                    instruments.map(async (instrument) => {
                        const [details, history, availableActions] = await Promise.all([
                            this.getInstrumentDetails(instrument.id, instrument.instrumentType),
                            this.historyService.getHistoryForInstrument(instrument.id),
                            this.instrumentStatusService.getAvailableActions(instrument.id),
                        ]);
                        return {
                            ...instrument,
                            details,
                            history,
                            availableActions,
                        };
                    })
                );

                return { ...request, instruments: instrumentsWithDetails };
            })
        );

        return requestsWithInstruments;
    }

    async findByTenderIdWithTender(tenderId: number) {
        const [requests, tender] = await Promise.all([
            this.findByTenderId(tenderId),
            this.tenderInfosService.getTenderForPayment(tenderId),
        ]);

        return { requests, tender };
    }

    async findById(requestId: number) {
        const [request] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        const instruments = await this.db
            .select()
            .from(paymentInstruments)
            .where(
                and(
                    eq(paymentInstruments.requestId, requestId),
                    eq(paymentInstruments.isActive, true)
                )
            );

        const instrumentsWithDetails = await Promise.all(
            instruments.map(async (instrument) => {
                const [details, history, availableActions] = await Promise.all([
                    this.getInstrumentDetails(instrument.id, instrument.instrumentType),
                    this.historyService.getHistoryForInstrument(instrument.id),
                    this.instrumentStatusService.getAvailableActions(instrument.id),
                ]);
                return {
                    ...instrument,
                    details,
                    history,
                    availableActions,
                };
            })
        );

        return { ...request, instruments: instrumentsWithDetails };
    }

    async findByIdWithTender(requestId: number) {
        const request = await this.findById(requestId);
        const tender = await this.tenderInfosService.getTenderForPayment(
            request.tenderId
        );

        return { ...request, tender };
    }

    private async getInstrumentDetails(
        instrumentId: number,
        instrumentType: string
    ) {
        switch (instrumentType) {
            case 'DD':
            case 'Cheque':
                const [dd] = await this.db
                    .select()
                    .from(instrumentDdDetails)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                    .limit(1);
                return dd || null;
            case 'FDR':
                const [fdr] = await this.db
                    .select()
                    .from(instrumentFdrDetails)
                    .where(eq(instrumentFdrDetails.instrumentId, instrumentId))
                    .limit(1);
                return fdr || null;
            case 'BG':
                const [bg] = await this.db
                    .select()
                    .from(instrumentBgDetails)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                    .limit(1);
                return bg || null;
            case 'Bank Transfer':
            case 'Portal Payment':
                const [transfer] = await this.db
                    .select()
                    .from(instrumentTransferDetails)
                    .where(eq(instrumentTransferDetails.instrumentId, instrumentId))
                    .limit(1);
                return transfer || null;
            default:
                return null;
        }
    }

    async update(requestId: number, payload: UpdatePaymentRequestDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        // Get existing active instrument
        const [existingInstrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(
                and(
                    eq(paymentInstruments.requestId, requestId),
                    eq(paymentInstruments.isActive, true)
                )
            )
            .limit(1);

        if (!existingInstrument) {
            throw new NotFoundException(
                `No active instrument found for request ${requestId}`
            );
        }

        // Determine which mode/purpose this request is for
        let mode: string | undefined;
        let details: any;

        if (existing.purpose === 'EMD' && payload.emd?.mode) {
            mode = payload.emd.mode;
            details = payload.emd.details;
        } else if (existing.purpose === 'Tender Fee' && payload.tenderFee?.mode) {
            mode = payload.tenderFee.mode;
            details = payload.tenderFee.details;
        } else if (existing.purpose === 'Processing Fee' && payload.processingFee?.mode) {
            mode = payload.processingFee.mode;
            details = payload.processingFee.details;
        }

        if (!mode || !details) {
            throw new BadRequestException(
                'Invalid update payload for this payment request type'
            );
        }

        // Check if instrument type is changing
        const newType = mapInstrumentType(mode);
        if (existingInstrument.instrumentType !== newType) {
            throw new BadRequestException(
                'Cannot change instrument type after creation. Please create a new request.'
            );
        }

        // Update instrument and details
        await this.updateInstrumentWithDetails(
            existingInstrument.id,
            mode,
            details
        );

        return this.findById(requestId);
    }

    private async updateInstrumentWithDetails(
        instrumentId: number,
        mode: string,
        details: any
    ): Promise<void> {
        const instrumentData: any = {
            updatedAt: new Date(),
        };

        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours
                ? parseInt(details.ddCourierHours)
                : null;
            instrumentData.issueDate = details.ddDate
                ? new Date(details.ddDate).toISOString().split('T')[0]
                : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate
                ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.fdrCourierAddress;
            instrumentData.courierDeadline = details.fdrCourierHours
                ? parseInt(details.fdrCourierHours)
                : null;
        } else if (mode === 'BG' && details.bgFavouring) {
            instrumentData.favouring = details.bgFavouring;
            instrumentData.expiryDate = details.bgExpiryDate
                ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.claimExpiryDate = details.bgClaimPeriod
                ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                : null;
            instrumentData.courierAddress = details.bgCourierAddress;
            instrumentData.courierDeadline = details.bgCourierDays || null;
        }

        if (Object.keys(instrumentData).length > 1) {
            await this.db
                .update(paymentInstruments)
                .set(instrumentData)
                .where(eq(paymentInstruments.id, instrumentId));
        }

        // Update detail table
        await this.updateDetailTable(instrumentId, mode, details);
    }

    private async updateDetailTable(
        instrumentId: number,
        mode: string,
        details: any
    ): Promise<void> {
        if (mode === 'DD' || mode === 'CHEQUE') {
            await this.db
                .update(instrumentDdDetails)
                .set({
                    ddDate: details.ddDate
                        ? new Date(details.ddDate).toISOString().split('T')[0]
                        : null,
                    ddPurpose: details.ddPurpose,
                    ddNeeds: details.ddDeliverBy,
                    ddRemarks: details.ddRemarks,
                })
                .where(eq(instrumentDdDetails.instrumentId, instrumentId));
        } else if (mode === 'FDR') {
            await this.db
                .update(instrumentFdrDetails)
                .set({
                    fdrDate: details.fdrDate
                        ? new Date(details.fdrDate).toISOString().split('T')[0]
                        : null,
                    fdrExpiryDate: details.fdrExpiryDate
                        ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                        : null,
                    fdrPurpose: details.fdrPurpose,
                    fdrNeeds: details.fdrDeliverBy,
                })
                .where(eq(instrumentFdrDetails.instrumentId, instrumentId));
        } else if (mode === 'BG') {
            await this.db
                .update(instrumentBgDetails)
                .set({
                    bgDate: details.bgExpiryDate
                        ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                        : null,
                    validityDate: details.bgExpiryDate
                        ? new Date(details.bgExpiryDate).toISOString().split('T')[0]
                        : null,
                    claimExpiryDate: details.bgClaimPeriod
                        ? new Date(details.bgClaimPeriod).toISOString().split('T')[0]
                        : null,
                    beneficiaryName: details.bgFavouring,
                    beneficiaryAddress: details.bgAddress,
                    bankName: details.bgBank,
                    stampCharges: details.bgStampValue?.toString() || null,
                    bgNeeds: details.bgNeededIn,
                    bgPurpose: details.bgPurpose,
                })
                .where(eq(instrumentBgDetails.instrumentId, instrumentId));
        } else if (mode === 'BANK_TRANSFER' || mode === 'BT') {
            await this.db
                .update(instrumentTransferDetails)
                .set({
                    accountName: details.btAccountName,
                    accountNumber: details.btAccountNo,
                    ifsc: details.btIfsc,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        } else if (mode === 'PORTAL' || mode === 'POP') {
            await this.db
                .update(instrumentTransferDetails)
                .set({
                    portalName: details.portalName,
                    paymentMethod:
                        details.portalNetBanking === 'YES'
                            ? 'Netbanking'
                            : details.portalDebitCard === 'YES'
                                ? 'Debit Card'
                                : null,
                    isNetbanking: details.portalNetBanking,
                    isDebit: details.portalDebitCard,
                })
                .where(eq(instrumentTransferDetails.instrumentId, instrumentId));
        }
    }

    async updateStatus(requestId: number, payload: UpdateStatusDto) {
        const [existing] = await this.db
            .select()
            .from(paymentRequests)
            .where(eq(paymentRequests.id, requestId))
            .limit(1);

        if (!existing) {
            throw new NotFoundException(
                `Payment request with ID ${requestId} not found`
            );
        }

        await this.db
            .update(paymentRequests)
            .set({
                status: payload.status,
                remarks: payload.remarks || existing.remarks,
            })
            .where(eq(paymentRequests.id, requestId));

        return this.findById(requestId);
    }

    async transitionInstrumentStatus(
        instrumentId: number,
        newStatus: string,
        formData: Record<string, unknown> = {},
        context: { userId?: number; userName?: string; remarks?: string } = {}
    ) {
        return this.instrumentStatusService.transitionStatus(
            instrumentId,
            newStatus,
            formData,
            context
        );
    }

    async rejectInstrument(
        instrumentId: number,
        rejectionReason: string,
        context: { userId?: number; userName?: string } = {}
    ) {
        return this.instrumentStatusService.rejectInstrument(
            instrumentId,
            rejectionReason,
            context
        );
    }

    async resubmitInstrument(
        rejectedInstrumentId: number,
        formData: Record<string, unknown>,
        context: { userId?: number; userName?: string } = {}
    ) {
        return this.instrumentStatusService.resubmitInstrument(
            rejectedInstrumentId,
            formData,
            context
        );
    }

    async getInstrumentAvailableActions(instrumentId: number) {
        return this.instrumentStatusService.getAvailableActions(instrumentId);
    }

    async getInstrumentHistory(instrumentId: number) {
        return this.historyService.getInstrumentChain(instrumentId);
    }

    /**
     * Helper method to send email notifications
     */
    private async sendEmail(
        eventType: string,
        tenderId: number,
        fromUserId: number,
        subject: string,
        template: string,
        data: Record<string, any>,
        recipients: { to?: RecipientSource[]; cc?: RecipientSource[] }
    ) {
        try {
            await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Send payment request email based on instrument type
     */
    private async sendPaymentRequestEmail(
        tenderId: number,
        instrumentInfo: { requestId: number; instrumentId: number; mode: string; purpose: PaymentPurpose; amount: number; details: any },
        tender: any,
        requestedBy: number
    ) {
        // Get instrument with details from database
        const [instrument] = await this.db
            .select()
            .from(paymentInstruments)
            .where(eq(paymentInstruments.id, instrumentInfo.instrumentId))
            .limit(1);

        if (!instrument) return;

        // Get accounts team ID
        const accountsTeamId = await this.getAccountsTeamId();
        if (!accountsTeamId) {
            this.logger.warn('Accounts team not found, skipping email');
            return;
        }

        // Format currency
        const formatCurrency = (amount: number) => {
            return `₹${amount.toLocaleString('en-IN')}`;
        };

        // Format date
        const formatDate = (dateStr: string | null) => {
            if (!dateStr) return 'Not specified';
            return new Date(dateStr).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        };

        // Format date time
        const formatDateTime = (date: Date | null) => {
            if (!date) return 'Not specified';
            return new Date(date).toLocaleString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        };

        const mode = instrumentInfo.mode.toUpperCase();
        let template = '';
        let emailData: Record<string, any> = {};
        let subject = '';

        // Get instrument details based on type
        if (mode === 'DD' || mode === 'CHEQUE') {
            const [ddDetails] = await this.db
                .select()
                .from(instrumentDdDetails)
                .where(eq(instrumentDdDetails.instrumentId, instrumentInfo.instrumentId))
                .limit(1);

            if (mode === 'DD') {
                template = 'demand-draft-request';
                subject = `Demand Draft Request: ${tender.tenderNo}`;
                emailData = {
                    chequeNo: ddDetails?.ddNo || 'N/A',
                    dueDate: formatDate(tender.dueDate),
                    amountFormatted: formatCurrency(instrumentInfo.amount),
                    timeLimit: instrument.courierDeadline ? `${instrument.courierDeadline} hours` : 'Not specified',
                    beneficiaryName: instrument.favouring || 'Not specified',
                    payableAt: instrument.payableAt || 'Not specified',
                    link: `#/tendering/emds/${instrumentInfo.requestId}`, // TODO: Update with actual frontend URL
                    courierAddress: instrument.courierAddress || 'Not specified',
                };
            } else {
                template = 'cheque-request';
                subject = `Cheque Request: ${tender.tenderNo}`;
                emailData = {
                    purpose: instrumentInfo.purpose,
                    partyName: instrument.favouring || 'Not specified',
                    chequeDate: formatDate(instrument.issueDate),
                    amount: formatCurrency(instrumentInfo.amount),
                    chequeNeeds: instrument.courierDeadline ? `${instrument.courierDeadline} hours` : 'Not specified',
                    link: `#/tendering/emds/${instrumentInfo.requestId}`,
                    assignee: 'Tender Executive', // TODO: Get from user
                    tlName: 'Team Leader', // TODO: Get from team leader
                };
            }
        } else if (mode === 'BG') {
            const [bgDetails] = await this.db
                .select()
                .from(instrumentBgDetails)
                .where(eq(instrumentBgDetails.instrumentId, instrumentInfo.instrumentId))
                .limit(1);

            template = 'bank-guarantee-request';
            subject = `Bank Guarantee Request: ${tender.tenderNo}`;
            emailData = {
                purpose: instrumentInfo.purpose,
                bg_in_favor_of: instrument.favouring || 'Not specified',
                bg_address: instrument.courierAddress || 'Not specified',
                bg_expiry_date: formatDate(instrument.expiryDate),
                bg_claim_date: formatDate(instrument.claimExpiryDate),
                amount: formatCurrency(instrumentInfo.amount),
                bg_stamp: bgDetails?.stampCharges?.toString() || 'Not specified',
                beneficiary_name: bgDetails?.beneficiaryName || 'Not specified',
                account_no: bgDetails?.bgBankAcc || 'Not specified',
                ifsc_code: bgDetails?.bgBankIfsc || 'Not specified',
                bg_needs: instrument.courierDeadline ? `${instrument.courierDeadline} hours` : 'Not specified',
                link_to_acc_form: `#/tendering/emds/${instrumentInfo.requestId}`,
                courier_address: instrument.courierAddress || 'Not specified',
                sign: 'Shivani', // TODO: Get from config or user
            };
        } else if (mode === 'FDR') {
            const [fdrDetails] = await this.db
                .select()
                .from(instrumentFdrDetails)
                .where(eq(instrumentFdrDetails.instrumentId, instrumentInfo.instrumentId))
                .limit(1);

            template = 'fixed-deposit-receipt-request';
            subject = `Fixed Deposit Receipt Request: ${tender.tenderNo}`;
            emailData = {
                purpose: instrumentInfo.purpose,
                beneficiaryName: instrument.favouring || 'Not specified',
                expiryDate: formatDate(instrument.expiryDate),
                amount: formatCurrency(instrumentInfo.amount),
                timeLimit: instrument.courierDeadline ? `${instrument.courierDeadline} hours` : 'Not specified',
                link: `#/tendering/emds/${instrumentInfo.requestId}`,
                courierAddress: instrument.courierAddress || 'Not specified',
            };
        } else if (mode === 'BANK_TRANSFER' || mode === 'BT') {
            const [btDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentInfo.instrumentId))
                .limit(1);

            template = 'bank-transfer-request';
            subject = `Bank Transfer Request: ${tender.tenderNo}`;
            emailData = {
                tenderNo: tender.tenderNo,
                tenderName: tender.tenderName,
                dueDateTime: formatDateTime(tender.dueDate),
                dueTime: tender.dueDate ? new Date(tender.dueDate).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                }) : 'Not specified',
                btAccName: btDetails?.accountName || 'Not specified',
                btAcc: btDetails?.accountNumber || 'Not specified',
                btIfsc: btDetails?.ifsc || 'Not specified',
                amount: formatCurrency(instrumentInfo.amount),
                link: `#/tendering/emds/${instrumentInfo.requestId}`,
                sign: 'Shivani', // TODO: Get from config or user
                tlName: 'Team Leader', // TODO: Get from team leader
            };
        } else if (mode === 'PORTAL' || mode === 'POP') {
            const [portalDetails] = await this.db
                .select()
                .from(instrumentTransferDetails)
                .where(eq(instrumentTransferDetails.instrumentId, instrumentInfo.instrumentId))
                .limit(1);

            template = 'pay-on-portal-request';
            subject = `Portal Payment Request: ${tender.tenderNo}`;
            emailData = {
                portal: portalDetails?.portalName || 'Payment Portal',
                purpose: instrumentInfo.purpose,
                isOthersPurpose: instrumentInfo.purpose !== 'EMD' && instrumentInfo.purpose !== 'Tender Fee',
                tender_no: tender.tenderNo,
                tender_name: tender.tenderName,
                dueDate: formatDateTime(tender.dueDate),
                amount: formatCurrency(instrumentInfo.amount),
                netbanking: portalDetails?.isNetbanking === 'Yes' ? 'Yes' : 'No',
                debit: portalDetails?.isDebit === 'Yes' ? 'Yes' : 'No',
                link: `#/tendering/emds/${instrumentInfo.requestId}`,
                sign: 'Shivani', // TODO: Get from config or user
                tlName: 'Team Leader', // TODO: Get from team leader
            };
        } else {
            // Unknown instrument type, skip email
            return;
        }

        await this.sendEmail(
            `payment-request.${mode.toLowerCase()}`,
            tenderId,
            requestedBy,
            subject,
            template,
            emailData,
            {
                to: [{ type: 'role', role: 'Admin', teamId: accountsTeamId }],
            }
        );
    }

    /**
     * Get Accounts team ID
     */
    private async getAccountsTeamId(): Promise<number | null> {
        const [accountsTeam] = await this.db
            .select({ id: teams.id })
            .from(teams)
            .where(sql`LOWER(${teams.name}) LIKE '%account%'`)
            .limit(1);

        return accountsTeam?.id || null;
    }
}
