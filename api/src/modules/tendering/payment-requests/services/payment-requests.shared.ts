import { eq, and, inArray, isNull, sql, not, or, SQL, gt } from 'drizzle-orm';
import { paymentRequests, paymentInstruments } from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';
import { DD_STATUSES, FDR_STATUSES, BG_STATUSES, CHEQUE_STATUSES, BT_STATUSES, PORTAL_STATUSES } from '../constants/payment-request-statuses';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

// ============================================================================
// Types - Re-exported from DTO
// ============================================================================

export type { 
    DashboardTab, 
    DashboardCounts, 
    PendingTabResponse, 
    RequestTabResponse,
    PendingTenderRow,
    PaymentRequestRow,
    CreatePaymentRequestDto, 
    UpdatePaymentRequestDto, 
    UpdateStatusDto,
    PaymentPurpose,
    InstrumentType
} from '../dto/payment-requests.dto';

// ============================================================================
// Status Constants
// ============================================================================

export const APPROVED_STATUSES = [
    DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BG_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
    DD_STATUSES.FOLLOWUP_INITIATED,
    FDR_STATUSES.FOLLOWUP_INITIATED,
    CHEQUE_STATUSES.FOLLOWUP_INITIATED,
    BT_STATUSES.FOLLOWUP_INITIATED,
    PORTAL_STATUSES.FOLLOWUP_INITIATED,
    BT_STATUSES.SETTLED_WITH_PROJECT,
    PORTAL_STATUSES.SETTLED_WITH_PROJECT,
    BG_STATUSES.BG_CREATED,
    BG_STATUSES.FDR_DETAILS_CAPTURED,
    BG_STATUSES.FOLLOWUP_INITIATED,
    BG_STATUSES.EXTENSION_REQUESTED,
    BG_STATUSES.RETURN_VIA_COURIER,
    BG_STATUSES.CANCELLATION_REQUESTED,
    BG_STATUSES.BG_CANCELLATION_CONFIRMED,
    BG_STATUSES.FDR_CANCELLED_CONFIRMED,
];

export const RETURNED_STATUSES = [
    DD_STATUSES.RETURN_VIA_COURIER,
    FDR_STATUSES.RETURN_VIA_COURIER,
    BG_STATUSES.RETURN_VIA_COURIER,
    DD_STATUSES.RETURN_VIA_BANK_TRANSFER,
    FDR_STATUSES.RETURN_VIA_BANK_TRANSFER,
    BT_STATUSES.RETURN_VIA_BANK_TRANSFER,
    PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER,
    DD_STATUSES.CANCELLED,
    FDR_STATUSES.CANCELLED,
    BG_STATUSES.BG_CANCELLATION_CONFIRMED,
    BG_STATUSES.FDR_CANCELLED_CONFIRMED,
    CHEQUE_STATUSES.CANCELLED_TORN,
    DD_STATUSES.SETTLED_WITH_PROJECT,
    FDR_STATUSES.SETTLED_WITH_PROJECT,
];

const REJECTED_STATUS_PATTERN = '%_REJECTED';

export const STATUSES = { APPROVED_STATUSES, RETURNED_STATUSES, REJECTED_STATUS_PATTERN };

// ============================================================================
// Role Filter Builders
// ============================================================================

export function buildTenderRoleFilters(user?: ValidatedUser, teamId?: number): any[] {
    const roleFilterConditions: any[] = [];

    if (user && user.roleId) {
        if (user.roleId === 1 || user.roleId === 2) {
            if (teamId !== undefined && teamId !== null) {
                roleFilterConditions.push(eq(tenderInfos.team, teamId));
            }
        } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
            if (user.teamId) {
                roleFilterConditions.push(eq(tenderInfos.team, user.teamId));
            } else {
                roleFilterConditions.push(sql`1 = 0`);
            }
        } else {
            if (user.sub) {
                roleFilterConditions.push(eq(tenderInfos.teamMember, user.sub));
            } else {
                roleFilterConditions.push(sql`1 = 0`);
            }
        }
    } else {
        roleFilterConditions.push(sql`1 = 0`);
    }

    return roleFilterConditions;
}

export function buildRequestRoleFilters(user?: ValidatedUser, teamId?: number): any[] {
    const roleFilterConditions: any[] = [];

    if (user && user.roleId) {
        if (user.roleId === 1 || user.roleId === 2) {
            if (teamId !== undefined && teamId !== null) {
                roleFilterConditions.push(eq(users.team, teamId));
            }
        } else if (user.roleId === 3 || user.roleId === 4 || user.roleId === 6) {
            if (user.teamId) {
                roleFilterConditions.push(eq(users.team, user.teamId));
            } else {
                roleFilterConditions.push(sql`1 = 0`);
            }
        } else {
            if (user.sub) {
                roleFilterConditions.push(eq(paymentRequests.requestedBy, user.sub));
            } else {
                roleFilterConditions.push(sql`1 = 0`);
            }
        }
    } else {
        roleFilterConditions.push(sql`1 = 0`);
    }

    return roleFilterConditions;
}

// ============================================================================
// Dashboard Helpers
// ============================================================================

export function getDefaultSortByTab(tab: string): SQL<unknown> {
    switch (tab) {
        case 'pending':
        case 'dnb':
            return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
        case 'sent':
        case 'paid':
        case 'rejected':
        case 'returned':
        case 'fees':
        case 'others':
            return sql`${tenderInfos.dueDate} DESC NULLS LAST`;
        default:
            return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
    }
}

export function getTabSqlCondition(tab: string) {
    const tenderExistsAndAmountPositive = and(
        gt(paymentRequests.tenderId, 0),
        sql`CAST(${paymentRequests.amountRequired} AS DECIMAL) > 0`
    );

    const rejectedStatus = sql`${paymentInstruments.status} LIKE '%REJECTED%'`;

    switch (tab) {
        case 'sent':
            return and(
                eq(paymentInstruments.action, 0),
                eq(paymentRequests.purpose, 'EMD'),
                tenderExistsAndAmountPositive
            );
        case 'paid':
            return and(
                eq(paymentRequests.purpose, 'EMD'),
                tenderExistsAndAmountPositive,
                or(
                    and(eq(paymentInstruments.action, 1), eq(paymentInstruments.status, 'ACCOUNTS_FORM_ACCEPTED')),
                    and(eq(paymentInstruments.action, 2), eq(paymentInstruments.status, 'FOLLOWUP_INITIATED'), inArray(paymentInstruments.instrumentType, ['DD', 'FDR', 'Cheque', 'Bank Transfer', 'Portal Payment'])),
                    and(eq(paymentInstruments.action, 4), eq(paymentInstruments.status, 'FOLLOWUP_INITIATED'), eq(paymentInstruments.instrumentType, 'BG'))
                )
            );
        case 'rejected':
            return rejectedStatus;
        case 'returned':
            return or(
                and(inArray(paymentInstruments.instrumentType, ['Bank Transfer', 'Portal Payment', 'DD', 'FDR']), inArray(paymentInstruments.action, [3, 4])),
                and(eq(paymentInstruments.instrumentType, 'BG'), eq(paymentInstruments.action, 6))
            );
        case 'fees':
            return and(
                sql`${paymentRequests.purpose} IN ('Tender Fee', 'Processing Fee')`,
                tenderExistsAndAmountPositive,
                not(rejectedStatus)
            );
        case 'others':
            return and(
                eq(paymentRequests.tenderId, 0),
                not(rejectedStatus)
            );
        default:
            return and(
                eq(paymentInstruments.action, 0),
                eq(paymentRequests.purpose, 'EMD'),
                tenderExistsAndAmountPositive
            );
    }
}

// ============================================================================
// Display Status Helpers
// ============================================================================

function deriveDisplayStatus(instrumentStatus: string | null): string {
    if (!instrumentStatus) return 'Pending';
    
    if (instrumentStatus === 'FOLLOWUP_INITIATED') return 'Followup';
    if (APPROVED_STATUSES.some(s => instrumentStatus === s)) return 'Approved';
    if (RETURNED_STATUSES.some(s => instrumentStatus === s)) return 'Returned';
    if (instrumentStatus.includes('REJECTED')) return 'Rejected';
    
    return 'Sent';
}

export { deriveDisplayStatus };

// ============================================================================
// Helper Functions
// ============================================================================

export function extractAmountFromDetails(mode: string, details: any): number {
    if (!details) return 0;
    
    const amountMap: Record<string, string> = {
        'DD': 'ddAmount',
        'FDR': 'fdrAmount',
        'BG': 'bgAmount',
        'CHEQUE': 'chequeAmount',
        'BANK_TRANSFER': 'btAmount',
        'PORTAL': 'portalAmount',
    };
    
    const amountKey = amountMap[mode];
    if (!amountKey || !details[amountKey]) return 0;
    
    return Number(details[amountKey]) || 0;
}