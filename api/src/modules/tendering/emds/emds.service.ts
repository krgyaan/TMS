import { Inject, Injectable, NotFoundException, BadRequestException, } from '@nestjs/common';
import { eq, and, inArray, or, gt, asc, desc, isNull, sql, isNotNull, not } from 'drizzle-orm';
import { DRIZZLE } from '@db/database.module';
import type { DbInstance } from '@db';
import { paymentRequests, paymentInstruments, instrumentDdDetails, instrumentFdrDetails, instrumentBgDetails, instrumentChequeDetails, instrumentTransferDetails, type PaymentRequest, type PaymentInstrument, } from '@db/schemas/tendering/emds.schema';
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
import type { CreatePaymentRequestDto, UpdatePaymentRequestDto, UpdateStatusDto, PaymentPurpose, InstrumentType, } from '@/modules/tendering/emds/dto/emds.dto';
import { DD_STATUSES, FDR_STATUSES, BG_STATUSES, CHEQUE_STATUSES, BT_STATUSES, PORTAL_STATUSES } from '@/modules/tendering/emds/constants/emd-statuses';
import { EmailService } from '@/modules/email/email.service';
import { RecipientResolver } from '@/modules/email/recipient.resolver';
import { PdfGeneratorService } from '@/modules/pdf/pdf-generator.service';
import type { RecipientSource } from '@/modules/email/dto/send-email.dto';
import { Logger } from '@nestjs/common';
import { TimersService } from '@/modules/timers/timers.service';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

export interface PendingTenderRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    gstValues: string | null;
    status: number;
    statusName: string | null;
    dueDate: Date | null;
    teamMemberId: number | null;
    teamMember: string | null;
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
    requestType: string | null;
    amountRequired: string;
    dueDate: Date | null;
    bidValid: Date | null;
    teamMember: string | null;
    teamMemberId: number | null;
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
    BG_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BT_STATUSES.SETTLED_WITH_PROJECT,
    PORTAL_STATUSES.SETTLED_WITH_PROJECT,
    BG_STATUSES.BG_CREATED,
    BG_STATUSES.FDR_DETAILS_CAPTURED,
    BG_STATUSES.FOLLOWUP_INITIATED,
    BG_STATUSES.EXTENSION_REQUESTED,
    BG_STATUSES.COURIER_RETURN_RECEIVED,
    BG_STATUSES.CANCELLATION_REQUESTED,
    BG_STATUSES.BG_CANCELLATION_CONFIRMED,
    BG_STATUSES.FDR_CANCELLED_CONFIRMED,
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
    BG_STATUSES.FDR_CANCELLED_CONFIRMED,
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
        BT: 'Bank Transfer',
        PORTAL: 'Portal Payment',
        POP: 'Portal Payment',
    };
    return mapping[mode] || 'DD';
};

/**
 * Extract amount from details based on mode
 * Used for non-TMS requests where amounts come from form fields
 */
const extractAmountFromDetails = (mode: string, details: any): number => {
    switch (mode) {
        case 'DD':
            return Number(details.ddAmount) || 0;
        case 'CHEQUE':
            return Number(details.chequeAmount) || 0;
        case 'FDR':
            return Number(details.fdrAmount) || 0;
        case 'BG':
            return Number(details.bgAmount) || 0;
        case 'BT':
        case 'BANK_TRANSFER':
            return Number(details.btAmount) || 0;
        case 'POP':
        case 'PORTAL':
            return Number(details.portalAmount) || 0;
        default:
            return 0;
    }
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
        private readonly pdfGenerator: PdfGeneratorService,
        private readonly timersService: TimersService,
    ) { }

    async getDashboardData(
        tab: DashboardTab = 'pending',
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        search?: string
    ): Promise<PendingTabResponse | RequestTabResponse> {
        const counts = await this.getDashboardCounts(user, teamId);

        if (tab === 'pending') return this.getPendingTenders(user, teamId, pagination, sort, counts, search);
        if (tab === 'tender-dnb') return this.getTenderDnbTenders(user, teamId, pagination, sort, counts, search);

        return this.getPaymentRequestsByTab(tab, user, teamId, pagination, sort, counts, search);
    }

    async getDashboardCounts(user?: ValidatedUser, teamId?: number): Promise<DashboardCounts> {
        // STRICT: Only show active, approved, valid tenders for "To Do"
        const pendingCount = await this.countPendingTenders(user, teamId);

        // PERMISSIVE: Show ALL active instruments regardless of Tender state
        const requestCounts = await this.countRequestsByStatus(user, teamId);

        // STRICT: Only DNB
        const tenderDnbCount = await this.countTenderDnb(user, teamId);

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
     * Build role-based filter conditions for tender queries
     */
    private buildRoleFilterConditions(user?: ValidatedUser, teamId?: number): any[] {
        const roleFilterConditions: any[] = [];

        if (user && user.roleId) {
            if (user.roleId === 1 || user.roleId === 2) {
                // Super User or Admin: Show all, respect teamId filter if provided
                if (teamId !== undefined && teamId !== null) {
                    roleFilterConditions.push(eq(tenderInfos.team, teamId));
                }
                // If no teamId filter, show all (no additional condition added)
            } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
                // Team Leader, Coordinator, Engineer: Filter by primary_team_id
                if (user.teamId) {
                    roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            } else {
                // All other roles: Show only own tenders
                if (user.sub) {
                    roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
                } else {
                    roleFilterConditions.push(sql`1 = 0`); // Empty results
                }
            }
        } else {
            // No user provided - return empty for security
            roleFilterConditions.push(sql`1 = 0`);
        }

        return roleFilterConditions;
    }

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

    private async countRequestsByStatus(user?: ValidatedUser, teamId?: number): Promise<{ sent: number; approved: number; rejected: number; returned: number; }> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

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
            .where(roleFilterConditions.length > 0 ? and(...roleFilterConditions) : undefined);

        return {
            sent: Number(result?.sent || 0),
            approved: Number(result?.approved || 0),
            rejected: Number(result?.rejected || 0),
            returned: Number(result?.returned || 0),
        };
    }

    private async getPaymentRequestsByTab(
        tab: DashboardTab,
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<RequestTabResponse> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        // Build search conditions
        const searchConditions: any[] = [];
        if (search) {
            const searchStr = `%${search}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${paymentRequests.tenderNo} ILIKE ${searchStr}`,
                sql`${paymentRequests.projectName} ILIKE ${searchStr}`,
                sql`${paymentRequests.purpose}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.type}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.amountRequired}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${paymentRequests.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${paymentInstruments.instrumentType} ILIKE ${searchStr}`,
                sql`${paymentInstruments.status} ILIKE ${searchStr}`
            );
        }

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

        const whereClause = and(
            this.getTabSqlCondition(tab),
            eq(paymentInstruments.isActive, true),
            ...roleFilterConditions,
            searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
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
                tenderNo: tenderInfos.tenderNo,
                projectNo: paymentRequests.tenderNo,
                tenderName: tenderInfos.tenderName,
                projectName: paymentRequests.projectName,
                purpose: paymentRequests.purpose,
                requestType: paymentRequests.type,
                amountRequired: paymentRequests.amountRequired,
                dueDate: tenderInfos.dueDate,
                dueDate2: paymentRequests.dueDate,
                bidValid: tenderInformation.bidValidityDays,
                teamMember: users.name,
                teamMemberId: users.id,
                instrumentId: paymentInstruments.id,
                instrumentType: paymentInstruments.instrumentType,
                instrumentStatus: paymentInstruments.status,
                createdAt: paymentRequests.createdAt,
            })
            .from(paymentRequests)
            .leftJoin(tenderInfos, eq(tenderInfos.id, paymentRequests.tenderId))
            .leftJoin(tenderInformation, eq(tenderInformation.tenderId, tenderInfos.id))
            .leftJoin(users, eq(users.id, paymentRequests.requestedBy))
            .leftJoin(paymentInstruments, and(
                eq(paymentInstruments.requestId, paymentRequests.id),
                eq(paymentInstruments.isActive, true)
            ))
            .where(whereClause)
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const data: PaymentRequestRow[] = rows.map((row) => {
            const effectiveDueDate = row.dueDate ?? row.dueDate2;

            return {
                id: row.id,
                tenderId: row.tenderId,
                tenderNo: row.tenderNo?.toString() ?? row.projectNo?.toString() ?? '',
                tenderName: row.tenderName?.toString() ?? row.projectName?.toString() ?? '',
                purpose: row.purpose as PaymentPurpose,
                amountRequired: row.amountRequired ?? '0',
                requestType: row.requestType,
                dueDate: effectiveDueDate,

                bidValid: row.bidValid && effectiveDueDate
                    ? (() => {
                        const date = new Date(effectiveDueDate);
                        date.setDate(date.getDate() + row.bidValid);
                        return date;
                    })()
                    : null,

                teamMemberId: row.teamMemberId,
                teamMember: row.teamMember?.toString() ?? null,
                instrumentId: row.instrumentId,
                instrumentType: row.instrumentType as InstrumentType | null,
                instrumentStatus: row.instrumentStatus,
                displayStatus: deriveDisplayStatus(row.instrumentStatus),
                createdAt: row.createdAt,
            };
        });


        return {
            ...wrapPaginatedResponse(data, Number(countResult?.count || 0), page, limit),
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    private async countPendingTenders(user?: ValidatedUser, teamId?: number): Promise<number> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);

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
                        inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                    ),
                    or(
                        gt(tenderInfos.emd, sql`0`),
                        gt(tenderInfos.tenderFees, sql`0`),
                        gt(tenderInformation.processingFeeAmount, sql`0`)
                    ),
                    // No payment request exists
                    sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
                    ...roleFilterConditions
                )
            );

        return Number(result?.count || 0);
    }

    private async getPendingTenders(
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<PendingTabResponse> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;

        // Build search conditions
        const searchConditions: any[] = [];
        if (search) {
            const searchStr = `%${search}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.emd}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderFees}::text ILIKE ${searchStr}`,
                sql`${tenderInformation.processingFeeAmount}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`
            );
        }

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
                case 'teamMember':
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
        const totalCount = counts?.pending ?? await this.countPendingTenders(user, teamId);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
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
                        inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                    ),
                    or(
                        gt(tenderInfos.emd, sql`0`),
                        gt(tenderInfos.tenderFees, sql`0`),
                        gt(tenderInformation.processingFeeAmount, sql`0`)
                    ),
                    sql`${tenderInfos.id} NOT IN (SELECT tender_id FROM payment_requests)`,
                    ...roleFilterConditions,
                    searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
                )
            )
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const wrapped = wrapPaginatedResponse(rows as PendingTenderRow[], totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    private async countTenderDnb(user?: ValidatedUser, teamId?: number): Promise<number> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
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
                        inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                    ),
                    ...roleFilterConditions
                )
            );

        return Number(result?.count || 0);
    }

    private async getTenderDnbTenders(
        user?: ValidatedUser,
        teamId?: number,
        pagination?: { page?: number; limit?: number },
        sort?: { sortBy?: string; sortOrder?: 'asc' | 'desc' },
        counts?: DashboardCounts,
        search?: string
    ): Promise<PendingTabResponse> {
        const roleFilterConditions = this.buildRoleFilterConditions(user, teamId);
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 50;
        const offset = (page - 1) * limit;
        const dnbStatusIds = StatusCache.getIds('dnb');

        // Build search conditions
        const searchConditions: any[] = [];
        if (search) {
            const searchStr = `%${search}%`;
            searchConditions.push(
                sql`${tenderInfos.tenderName} ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderNo} ILIKE ${searchStr}`,
                sql`${tenderInfos.gstValues}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.emd}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.tenderFees}::text ILIKE ${searchStr}`,
                sql`${tenderInformation.processingFeeAmount}::text ILIKE ${searchStr}`,
                sql`${tenderInfos.dueDate}::text ILIKE ${searchStr}`,
                sql`${users.name} ILIKE ${searchStr}`,
                sql`${statuses.name} ILIKE ${searchStr}`
            );
        }

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
                case 'teamMember':
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
        const totalCount = counts?.tenderDnb ?? await this.countTenderDnb(user, teamId);

        // Get paginated data
        const rows = await this.db
            .select({
                tenderId: tenderInfos.id,
                tenderNo: tenderInfos.tenderNo,
                tenderName: tenderInfos.tenderName,
                dueDate: tenderInfos.dueDate,
                teamMemberId: tenderInfos.teamMember,
                teamMember: users.name,
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
                        inArray(tenderInformation.emdRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.tenderFeeRequired, ['Yes', 'YES']),
                        inArray(tenderInformation.processingFeeRequired, ['Yes', 'YES'])
                    ),
                    ...roleFilterConditions,
                    searchConditions.length > 0 ? sql`(${sql.join(searchConditions, sql` OR `)})` : undefined
                )
            )
            .orderBy(orderClause)
            .limit(limit)
            .offset(offset);

        const wrapped = wrapPaginatedResponse(rows as PendingTenderRow[], totalCount, page, limit);
        return {
            ...wrapped,
            counts: counts || await this.getDashboardCounts(user, teamId),
        };
    }

    async create(
        tenderId: number,
        payload: CreatePaymentRequestDto,
        userId?: number
    ) {
        // Check if this is a non-TMS request (Old Entries or Other Than Tender)
        const isNonTmsRequest = payload.type === 'Old Entries' || payload.type === 'Other Than Tender';

        let tender: any = null;
        let currentTender: any = null;
        let prevStatus: number | null = null;
        let infoSheet: any = null;

        // Only fetch tender data for TMS requests
        if (!isNonTmsRequest && tenderId > 0) {
            tender = await this.tenderInfosService.getTenderForPayment(tenderId);
            currentTender = await this.tenderInfosService.findById(tenderId);
            prevStatus = currentTender?.status ?? null;

            [infoSheet] = await this.db
                .select()
                .from(tenderInformation)
                .where(eq(tenderInformation.tenderId, tenderId))
                .limit(1);
        }

        // For non-TMS requests, create a minimal tender object from payload
        if (isNonTmsRequest) {
            tender = {
                tenderNo: payload.tenderNo || 'NA',
                tenderName: payload.tenderName || null,
                dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
                emd: null,
                tenderFees: null,
            };
        }

        const createdRequests: PaymentRequest[] = [];
        const createdInstruments: Array<{ requestId: number; instrumentId: number; mode: string; purpose: PaymentPurpose; amount: number; details: any }> = [];
        let emdRequested = false;

        await this.db.transaction(async (tx) => {
            // Create EMD request if mode is provided
            if (payload.emd?.mode && payload.emd?.details) {
                // Use mode-specific amount for non-TMS requests, otherwise use tender amount
                const emdAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.emd.mode, payload.emd.details)
                    : Number(tender?.emd) || 0;

                if (emdAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'EMD',
                        emdAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate
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

                    // For DD/FDR, create linked Cheque request
                    if (payload.emd.mode === 'DD' || payload.emd.mode === 'FDR') {
                        // Get the detail record ID that was just created
                        const detailId = await this.getDetailIdForInstrument(
                            tx,
                            instrument.id,
                            payload.emd.mode
                        );

                        if (detailId) {
                            const chequeRequest = await this.createLinkedChequeRequest(
                                tx,
                                request.id,
                                instrument.id,
                                detailId,
                                payload.emd.mode,
                                payload.emd.details,
                                emdAmount,
                                tenderId,
                                tender,
                                userId,
                                payload.type,
                                payload.tenderNo,
                                payload.tenderName,
                                payload.dueDate
                            );

                            createdInstruments.push({
                                requestId: chequeRequest.requestId,
                                instrumentId: chequeRequest.instrumentId,
                                mode: 'CHEQUE',
                                purpose: 'EMD',
                                amount: emdAmount,
                                details: chequeRequest.details,
                            });
                        }
                    }
                }
            }

            // Create Tender Fee request if mode is provided
            if (payload.tenderFee?.mode && payload.tenderFee?.details) {
                // Use mode-specific amount for non-TMS requests, otherwise use tender amount
                const tenderFeeAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.tenderFee.mode, payload.tenderFee.details)
                    : Number(tender?.tenderFees) || 0;

                if (tenderFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Tender Fee',
                        tenderFeeAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate
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
            if (payload.processingFee?.mode && payload.processingFee?.details) {
                // Use mode-specific amount for non-TMS requests, otherwise use infoSheet amount
                const processingFeeAmount = isNonTmsRequest
                    ? extractAmountFromDetails(payload.processingFee.mode, payload.processingFee.details)
                    : (infoSheet?.processingFeeAmount ? Number(infoSheet.processingFeeAmount) : 0);

                if (processingFeeAmount > 0) {
                    const request = await this.createPaymentRequest(
                        tx,
                        tenderId,
                        'Processing Fee',
                        processingFeeAmount,
                        tender,
                        userId,
                        payload.type,
                        payload.tenderNo,
                        payload.tenderName,
                        payload.dueDate
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
            // Only for TMS requests with valid tenderId
            if (emdRequested && userId && !isNonTmsRequest && tenderId > 0) {
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

        // Return immediately after transaction commits to avoid blocking the HTTP response
        // Background operations (PDF generation, emails, timer transition) run asynchronously
        this.handleBackgroundOperations(
            createdInstruments,
            tenderId,
            tender,
            userId,
            emdRequested,
            isNonTmsRequest
        ).catch((error) => {
            this.logger.error('Background operations failed:', error);
        });

        return createdRequests;
    }

    /**
     * Handle background operations (PDF generation, emails, timer transition) asynchronously
     * This runs after the HTTP response is returned to avoid blocking and timeout issues
     */
    private async handleBackgroundOperations(
        createdInstruments: Array<{ requestId: number; instrumentId: number; mode: string; purpose: PaymentPurpose; amount: number; details: any }>,
        tenderId: number,
        tender: any,
        userId: number | undefined,
        emdRequested: boolean,
        isNonTmsRequest: boolean
    ): Promise<void> {
        try {
            // Generate PDFs for DD, FDR, and BG instruments (after transaction commits)
            for (const instrumentInfo of createdInstruments) {
                if (instrumentInfo.mode === 'DD' || instrumentInfo.mode === 'FDR' || instrumentInfo.mode === 'BG') {
                    try {
                        await this.generatePdfsForInstrument(
                            instrumentInfo.instrumentId,
                            instrumentInfo.mode,
                            instrumentInfo.requestId,
                            tender,
                            userId
                        );
                    } catch (error) {
                        this.logger.error(
                            `Failed to generate PDFs for instrument ${instrumentInfo.instrumentId} (${instrumentInfo.mode}): ${error instanceof Error ? error.message : String(error)}`
                        );
                        // Continue with other instruments even if PDF generation fails
                    }
                }
            }

            // Send email notifications for each created instrument
            // Only if we have a valid tender object
            if (tender) {
                for (const instrumentInfo of createdInstruments) {
                    try {
                        await this.sendPaymentRequestEmail(tenderId || 0, instrumentInfo, tender, userId || 0);
                    } catch (error) {
                        this.logger.error(
                            `Failed to send email for instrument ${instrumentInfo.instrumentId} (${instrumentInfo.mode}): ${error instanceof Error ? error.message : String(error)}`
                        );
                        // Continue with other instruments even if email sending fails
                    }
                }
            }

            // TIMER TRANSITION: Stop emd_requested timer if EMD was requested
            // Only for TMS requests with valid tenderId
            if (emdRequested && userId && !isNonTmsRequest && tenderId > 0) {
                try {
                    this.logger.log(`Stopping timer for tender ${tenderId} after EMD requested`);
                    await this.timersService.stopTimer({
                        entityType: 'TENDER',
                        entityId: tenderId,
                        stage: 'emd_requested',
                        userId: userId,
                        reason: 'EMD requested'
                    });
                    this.logger.log(`Successfully stopped emd_requested timer for tender ${tenderId}`);
                } catch (error) {
                    this.logger.error(`Failed to stop timer for tender ${tenderId} after EMD requested:`, error);
                    // Don't fail the entire operation if timer transition fails
                }
            }
        } catch (error) {
            this.logger.error('Unexpected error in background operations:', error);
            // Re-throw to be caught by the caller's error handler
            throw error;
        }
    }

    private async createPaymentRequest(
        tx: DbInstance,
        tenderId: number,
        purpose: PaymentPurpose,
        amount: number,
        tender: any,
        userId?: number,
        type?: string,
        tenderNo?: string,
        tenderName?: string,
        dueDate?: string
    ): Promise<PaymentRequest> {
        // Use payload values if provided, otherwise fall back to tender object
        // For Old Entries or Other Than Tender, default to 'NA' if tender info is not available
        const isNonTmsRequest = type === 'Old Entries' || type === 'Other Than Tender' || type === 'Other Than TMS';
        const requestTenderNo = tenderNo || tender?.tenderNo || (isNonTmsRequest && tenderId === 0 ? 'NA' : 'NA');
        const requestProjectName = tenderName || tender?.tenderName || (isNonTmsRequest && tenderId === 0 ? 'NA' : null);
        const requestDueDate = dueDate
            ? new Date(dueDate)
            : (tender?.dueDate ? new Date(tender.dueDate) : null);

        const requestType: 'TMS' | 'Other Than TMS' | 'Old Entries' | 'Other Than Tender' =
            (type === 'Old Entries' || type === 'Other Than Tender' || type === 'Other Than TMS')
                ? type
                : 'TMS';

        const [request] = await tx
            .insert(paymentRequests)
            .values({
                tenderId: tenderId || 0,
                type: requestType,
                purpose,
                amountRequired: amount.toString(),
                dueDate: requestDueDate,
                tenderNo: requestTenderNo,
                projectName: requestProjectName,
                status: 'Pending',
                requestedBy: userId || null,
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
            action: 0,
            isActive: true,
        };

        // Map common fields based on mode
        if (mode === 'DD' && details.ddFavouring) {
            instrumentData.favouring = details.ddFavouring;
            instrumentData.payableAt = details.ddPayableAt;
            instrumentData.ddDeliverBy = details.ddDeliverBy;
            instrumentData.courierAddress = details.ddCourierAddress;
            instrumentData.courierDeadline = details.ddCourierHours
                ? parseInt(details.ddCourierHours)
                : null;
            instrumentData.issueDate = details.ddDate
                ? new Date(details.ddDate).toISOString().split('T')[0]
                : null;
            instrumentData.remarks = details.ddRemarks;
        } else if (mode === 'CHEQUE' && details.chequeFavouring) {
            instrumentData.favouring = details.chequeFavouring;
            instrumentData.issueDate = details.chequeDate
                ? new Date(details.chequeDate).toISOString().split('T')[0]
                : null;
        } else if (mode === 'FDR' && details.fdrFavouring) {
            instrumentData.favouring = details.fdrFavouring;
            instrumentData.expiryDate = details.fdrExpiryDate
                ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                : null;
            instrumentData.fdrNeeds = details.fdrDeliverBy;
            instrumentData.fdrPurpose = details.fdrPurpose;
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

        // Create detail record and get detail ID (for DD/FDR linking)
        const detailId = await this.createInstrumentDetails(tx, instrument.id, mode, details);

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
    ): Promise<number | null> {
        if (mode === 'DD') {
            const [ddDetail] = await tx.insert(instrumentDdDetails).values({
                instrumentId,
                ddDate: details.ddDate
                    ? new Date(details.ddDate).toISOString().split('T')[0]
                    : null,
                ddPurpose: details.ddPurpose,
                ddNeeds: details.ddDeliverBy,
                ddRemarks: details.ddRemarks,
            }).returning();
            return ddDetail?.id || null;
        } else if (mode === 'CHEQUE') {
            await tx.insert(instrumentChequeDetails).values({
                instrumentId,
                chequeDate: details.chequeDate
                    ? new Date(details.chequeDate).toISOString().split('T')[0]
                    : null,
                chequeReason: details.chequePurpose,
                chequeNeeds: details.chequeNeededIn,
                bankName: details.chequeAccount,
                linkedDdId: details.linkedDdId || null,
                linkedFdrId: details.linkedFdrId || null,
            });
        } else if (mode === 'FDR') {
            const [fdrDetail] = await tx.insert(instrumentFdrDetails).values({
                instrumentId,
                fdrDate: details.fdrDate
                    ? new Date(details.fdrDate).toISOString().split('T')[0]
                    : null,
                fdrExpiryDate: details.fdrExpiryDate
                    ? new Date(details.fdrExpiryDate).toISOString().split('T')[0]
                    : null,
                fdrPurpose: details.fdrPurpose,
                fdrNeeds: details.fdrDeliverBy,
            }).returning();
            return fdrDetail?.id || null;
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
                stampCharges: details.bgStampValue != null ? String(details.bgStampValue) : null,
                bgNeeds: details.bgNeededIn,
                bgPurpose: details.bgPurpose,
                bgClientUser: details.bgClientUserEmail,
                bgClientCp: details.bgClientCpEmail,
                bgClientFin: details.bgClientFinanceEmail,
                bgBankAcc: details.bgBankAccountNo,
                bgBankIfsc: details.bgBankIfsc,
                bgPo: Array.isArray(details.bgPoFiles) && details.bgPoFiles.length > 0
                    ? details.bgPoFiles[0]
                    : details.bgPoFiles,
            });
        } else if (mode === 'BANK_TRANSFER' || mode === 'BT') {
            await tx.insert(instrumentTransferDetails).values({
                instrumentId,
                accountName: details.btAccountName,
                accountNumber: details.btAccountNo,
                ifsc: details.btIfsc,
                reason: details.btPurpose,
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
                reason: details.portalPurpose,
            });
        }

        return null;
    }

    private async getDetailIdForInstrument(
        tx: DbInstance,
        instrumentId: number,
        mode: string
    ): Promise<number | null> {
        if (mode === 'DD') {
            const [ddDetail] = await tx
                .select({ id: instrumentDdDetails.id })
                .from(instrumentDdDetails)
                .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                .limit(1);
            return ddDetail?.id || null;
        } else if (mode === 'FDR') {
            const [fdrDetail] = await tx
                .select({ id: instrumentFdrDetails.id })
                .from(instrumentFdrDetails)
                .where(eq(instrumentFdrDetails.instrumentId, instrumentId))
                .limit(1);
            return fdrDetail?.id || null;
        }
        return null;
    }

    private async createLinkedChequeRequest(
        tx: DbInstance,
        originalRequestId: number,
        originalInstrumentId: number,
        detailId: number | null,
        mode: 'DD' | 'FDR',
        originalDetails: any,
        amount: number,
        tenderId: number,
        tender: any,
        userId?: number,
        type?: string,
        tenderNo?: string,
        tenderName?: string,
        dueDate?: string
    ): Promise<{ requestId: number; instrumentId: number; details: any }> {
        // Create payment request (same tender details as original)
        const chequeRequest = await this.createPaymentRequest(
            tx,
            tenderId,
            'EMD',
            amount,
            tender,
            userId,
            type,
            tenderNo,
            tenderName,
            dueDate
        );

        // Prepare cheque details from DD/FDR details
        const chequeDetails: any = {
            chequeFavouring: mode === 'DD' ? originalDetails.ddFavouring : originalDetails.fdrFavouring,
            chequeAmount: amount,
            chequeDate: new Date().toISOString().split('T')[0], // today
            chequeNeededIn: mode === 'DD' ? originalDetails.ddDeliverBy : originalDetails.fdrDeliverBy,
            chequePurpose: mode, // "DD" or "FDR"
            chequeAccount: '', // Not required for linked cheque
        };

        // Set linked ID in details for createInstrumentDetails to use
        if (detailId) {
            if (mode === 'DD') {
                chequeDetails.linkedDdId = detailId;
            } else if (mode === 'FDR') {
                chequeDetails.linkedFdrId = detailId;
            }
        }

        // Create cheque instrument
        const chequeInstrument = await this.createInstrumentWithDetails(
            tx,
            chequeRequest.id,
            'CHEQUE',
            chequeDetails,
            amount,
            userId
        );

        return {
            requestId: chequeRequest.id,
            instrumentId: chequeInstrument.id,
            details: chequeDetails,
        };
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
                const [dd] = await this.db
                    .select()
                    .from(instrumentDdDetails)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                    .limit(1);
                return dd || null;
            case 'Cheque':
                const [cheque] = await this.db
                    .select()
                    .from(instrumentChequeDetails)
                    .where(eq(instrumentChequeDetails.instrumentId, instrumentId))
                    .limit(1);
                return cheque || null;
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
        } else if (mode === 'CHEQUE' && details.chequeFavouring) {
            instrumentData.favouring = details.chequeFavouring;
            instrumentData.issueDate = details.chequeDate
                ? new Date(details.chequeDate).toISOString().split('T')[0]
                : null;
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
        if (mode === 'DD') {
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
        } else if (mode === 'CHEQUE') {
            await this.db
                .update(instrumentChequeDetails)
                .set({
                    chequeDate: details.chequeDate
                        ? new Date(details.chequeDate).toISOString().split('T')[0]
                        : null,
                    chequeReason: details.chequePurpose,
                    chequeNeeds: details.chequeNeededIn,
                    bankName: details.chequeAccount,
                })
                .where(eq(instrumentChequeDetails.instrumentId, instrumentId));
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
                    stampCharges: details.bgStampValue ? details.bgStampValue.toString() : null,
                    bgNeeds: details.bgNeededIn,
                    bgPurpose: details.bgPurpose,
                    bgClientUser: details.bgClientUserEmail,
                    bgClientCp: details.bgClientCpEmail,
                    bgClientFin: details.bgClientFinanceEmail,
                    bgBankAcc: details.bgBankAccountNo,
                    bgBankIfsc: details.bgBankIfsc,
                    bgPo: Array.isArray(details.bgPoFiles) && details.bgPoFiles.length > 0
                        ? details.bgPoFiles[0]
                        : details.bgPoFiles,
                })
                .where(eq(instrumentBgDetails.instrumentId, instrumentId));
        } else if (mode === 'BANK_TRANSFER' || mode === 'BT') {
            await this.db
                .update(instrumentTransferDetails)
                .set({
                    accountName: details.btAccountName,
                    accountNumber: details.btAccountNo,
                    ifsc: details.btIfsc,
                    reason: details.btPurpose,
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
                    reason: details.portalPurpose,
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
            const result = await this.emailService.sendTenderEmail({
                tenderId,
                eventType,
                fromUserId,
                to: recipients.to || [],
                cc: recipients.cc,
                subject,
                template,
                data,
            });

            if (!result.success) {
                this.logger.error(
                    `Failed to send email for tender ${tenderId}: ${result.error || 'Unknown error'}. ` +
                    `Event: ${eventType}, Template: ${template}, FromUserId: ${fromUserId}`
                );
            } else {
                this.logger.debug(`Email sent successfully for tender ${tenderId}, emailLogId: ${result.emailLogId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to send email for tender ${tenderId}: ${error instanceof Error ? error.message : String(error)}`);
            // Don't throw - email failure shouldn't break main operation
        }
    }

    /**
     * Generate PDFs for DD, FDR, or BG instrument
     */
    private async generatePdfsForInstrument(
        instrumentId: number,
        mode: string,
        requestId: number,
        tender: any,
        userId?: number
    ): Promise<void> {
        try {
            // Fetch instrument and details
            const [instrument] = await this.db
                .select()
                .from(paymentInstruments)
                .where(eq(paymentInstruments.id, instrumentId))
                .limit(1);

            if (!instrument) {
                this.logger.warn(`Instrument ${instrumentId} not found for PDF generation`);
                return;
            }

            // Fetch request
            const [request] = await this.db
                .select()
                .from(paymentRequests)
                .where(eq(paymentRequests.id, requestId))
                .limit(1);

            if (!request) {
                this.logger.warn(`Request ${requestId} not found for PDF generation`);
                return;
            }

            // Fetch user info if userId provided
            let user: any = null;
            if (userId) {
                user = await this.recipientResolver.getUserById(userId);
            }

            // Prepare PDF data based on instrument type
            let pdfData: Record<string, any> = {
                instrument,
                request,
                tender: tender || {},
                user: user || {},
                generatedAt: new Date(),
            };

            // Fetch instrument-specific details
            if (mode === 'DD') {
                const [ddDetails] = await this.db
                    .select()
                    .from(instrumentDdDetails)
                    .where(eq(instrumentDdDetails.instrumentId, instrumentId))
                    .limit(1);
                pdfData.ddDetails = ddDetails || {};
            } else if (mode === 'FDR') {
                const [fdrDetails] = await this.db
                    .select()
                    .from(instrumentFdrDetails)
                    .where(eq(instrumentFdrDetails.instrumentId, instrumentId))
                    .limit(1);
                pdfData.fdrDetails = fdrDetails || {};
            } else if (mode === 'BG') {
                const [bgDetails] = await this.db
                    .select()
                    .from(instrumentBgDetails)
                    .where(eq(instrumentBgDetails.instrumentId, instrumentId))
                    .limit(1);
                pdfData.bgDetails = bgDetails || {};
            }

            // Generate PDFs
            const templateType = mode === 'DD' || mode === 'FDR' ? 'chqCret' : 'bg';
            // Wrap pdfData in 'data' object to match template expectations
            const pdfPaths = await this.pdfGenerator.generatePdfs(
                templateType,
                { data: pdfData },
                instrumentId,
                mode
            );

            // Update instrument with PDF paths
            if (pdfPaths.length > 0) {
                const updateData: any = {
                    generatedPdf: pdfPaths[0],
                };

                // Store additional PDFs in extraPdfPaths
                if (pdfPaths.length > 1) {
                    updateData.extraPdfPaths = JSON.stringify(pdfPaths.slice(1));
                }

                await this.db
                    .update(paymentInstruments)
                    .set(updateData)
                    .where(eq(paymentInstruments.id, instrumentId));

                this.logger.log(`Generated ${pdfPaths.length} PDF(s) for instrument ${instrumentId} (${mode})`);
            }
        } catch (error) {
            this.logger.error(
                `Error generating PDFs for instrument ${instrumentId} (${mode}): ${error instanceof Error ? error.message : String(error)}`
            );
            throw error; // Re-throw to be caught by caller
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

        // Get tender team ID if not in tender object
        let tenderTeamId: number | null = null;
        if (tenderId > 0) {
            const tenderData = await this.tenderInfosService.findById(tenderId);
            tenderTeamId = tenderData?.team || null;
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
                subject = `DD Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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
                // CHEQUE might map to SB (Security Bank/Standby) in expected format
                subject = `SB Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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
            subject = `BG Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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
            subject = `FDR Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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
            subject = `BT Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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
            subject = `POP Request for EMD - ${tender.tenderName || tender.tenderNo}`;
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

        // Build CC recipients
        const ccRecipients: RecipientSource[] = [];

        // Add Team Admin and Team Leader from tender team (if tender team exists)
        if (tenderTeamId) {
            ccRecipients.push(
                { type: 'role', role: 'Admin', teamId: tenderTeamId },
                { type: 'role', role: 'Team Leader', teamId: tenderTeamId }
            );
        }

        // Add Account Team Leader from accounts team
        ccRecipients.push(
            { type: 'role', role: 'Team Leader', teamId: accountsTeamId }
        );

        await this.sendEmail(
            `payment-request.${mode.toLowerCase()}`,
            tenderId,
            requestedBy,
            subject,
            template,
            emailData,
            {
                to: [{ type: 'role', role: 'Admin', teamId: accountsTeamId }],
                cc: ccRecipients,
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
