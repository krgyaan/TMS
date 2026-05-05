import { eq, and, inArray, isNull, sql, not, or, SQL } from 'drizzle-orm';
import { paymentRequests, paymentInstruments } from '@db/schemas/tendering/payment-requests.schema';
import { tenderInfos, tenderInformation } from '@db/schemas/tendering/tenders.schema';
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

export const RETURNED_STATUSES = [
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
    BG_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
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
        case 'tender-dnb':
            return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
        case 'sent':
        case 'approved':
        case 'rejected':
        case 'returned':
            return sql`${tenderInfos.dueDate} DESC NULLS LAST`;
        default:
            return sql`${tenderInfos.dueDate} ASC NULLS LAST`;
    }
}

export function getTabSqlCondition(tab: string) {
    const isRejected = sql`${paymentInstruments.status} LIKE ${'%' + REJECTED_STATUS_PATTERN}`;
    const isReturned = inArray(paymentInstruments.status, RETURNED_STATUSES);
    const isApproved = inArray(paymentInstruments.status, APPROVED_STATUSES);
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

// ============================================================================
// Display Status Helpers
// ============================================================================

function deriveDisplayStatus(instrumentStatus: string | null): string {
    if (!instrumentStatus) return 'Pending';
    
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
        'BT': 'btAmount',
        'PORTAL': 'portalAmount',
    };
    
    const amountKey = amountMap[mode];
    if (!amountKey || !details[amountKey]) return 0;
    
    return Number(details[amountKey]) || 0;
}