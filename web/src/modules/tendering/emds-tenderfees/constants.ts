// Payment modes - use string identifiers that match backend
export const TENDER_FEE_MODES = [
    { value: 'PORTAL', label: 'Pay on Portal' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'DD', label: 'Demand Draft' },
];

export const PROCESSING_FEE_MODES = [
    { value: 'PORTAL', label: 'Pay on Portal' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'DD', label: 'Demand Draft' },
];

// Legacy mode mapping (database stores numeric, we need to convert)
export const MODE_VALUE_MAP: Record<string, string> = {
    '1': 'PORTAL',
    '2': 'BANK_TRANSFER',
    '3': 'DD',
    '4': 'BG',
    '5': 'FDR',
    '6': 'CHEQUE',
    'PORTAL': 'PORTAL',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'DD': 'DD',
    'BG': 'BG',
    'FDR': 'FDR',
    'CHEQUE': 'CHEQUE',
};

export const MODE_LABELS: Record<string, string> = {
    'DD': 'Demand Draft',
    'FDR': 'Fixed Deposit Receipt',
    'CHEQUE': 'Cheque',
    'BG': 'Bank Guarantee',
    'BANK_TRANSFER': 'Bank Transfer',
    'PORTAL': 'Payment on Portal',
    'BT': 'Bank Transfer',
};

export const PURPOSE_OPTIONS = [
    { value: 'EMD', label: 'EMD' },
    { value: 'TENDER_FEES', label: 'Tender Fees' },
    { value: 'PROCESSING_FEES', label: 'Processing Fees' },
    { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
    { value: 'OTHER_PAYMENT', label: 'Other Payment' },
    { value: 'OTHER_SECURITY', label: 'Other Security' },
];

export const BG_PURPOSE_OPTIONS = [
    { value: 'EMD', label: 'EMD' },
    { value: 'ADVANCE_PAYMENT', label: 'Advance Payment' },
    { value: 'SECURITY_BOND_DEPOSIT', label: 'Security Bond/Deposit' },
    { value: 'BID_BOND', label: 'Bid Bond' },
    { value: 'PERFORMANCE', label: 'Performance' },
    { value: 'FINANCIAL', label: 'Financial' },
    { value: 'COUNTER_GUARANTEE', label: 'Counter Guarantee' },
];

export const DELIVERY_OPTIONS = [
    { value: 'TENDER_DUE', label: 'Tender Due Date' },
    { value: '24', label: '24 Hours' },
    { value: '48', label: '48 Hours' },
];

export const CHEQUE_DELIVERY_OPTIONS = [
    { value: '3', label: '3 Hours' },
    { value: '6', label: '6 Hours' },
    { value: '12', label: '12 Hours' },
    { value: '24', label: '24 Hours' },
];

export const CHEQUE_PURPOSE = [
    { value: 'PAYABLE', label: 'Payable' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'DD', label: 'DD' },
    { value: 'FDR', label: 'FDR' },
];

export const BG_NEEDED_IN_OPTIONS = [
    { value: '48', label: '48 Hours' },
    { value: '72', label: '72 Hours' },
    { value: '96', label: '96 Hours' },
    { value: '120', label: '120 Hours' },
];

export const BANKS = [
    { value: 'BGLIMIT_0771', label: 'BG Limit' },
    { value: 'AU_8316', label: 'AU 8316' },
    { value: 'AU_5242', label: 'AU 5242' },
    { value: 'AU_5180', label: 'AU 5180' },
    { value: 'AU_5190', label: 'AU 5190' },
    { value: 'AU_9589', label: 'AU 9589' },
    { value: 'HDFC_0026', label: 'HDFC Bank 0026' },
    { value: 'HDFC_2828', label: 'HDFC Bank 2828' },
    { value: 'HDFC_2501', label: 'HDFC Bank 2501' },
    { value: 'HDFC_6446', label: 'HDFC Bank 6446' },
    { value: 'HDFC_0445', label: 'HDFC Bank 0445' },
    { value: 'PNB_6011', label: 'PNB Bank 6011' },
    { value: 'SBI', label: 'State Bank of India' },
    { value: 'ICICI', label: 'ICICI Bank' },
    { value: 'YESBANK_2011', label: 'Yes Bank 2011' },
    { value: 'YESBANK_0771', label: 'Yes Bank 0771' },
];

export const YES_NO_OPTIONS = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
];

// Helper to normalize mode values from database
export function normalizeModeValue(mode: string | null | undefined): string {
    if (!mode) return '';
    return MODE_VALUE_MAP[mode] || mode.toUpperCase();
}

// Helper to get allowed modes from comma-separated string or array
export function parseAllowedModes(modes: string | string[] | null | undefined): string[] {
    if (!modes) return ['DD', 'FDR', 'CHEQUE', 'BG', 'BANK_TRANSFER', 'PORTAL'];

    const modeArray = Array.isArray(modes)
        ? modes
        : modes.split(',').map(m => m.trim());

    return modeArray
        .filter(m => m !== '' && m !== '0')
        .map(m => normalizeModeValue(m));
}

// ============================================================================
// Instrument Types (matches database)
// ============================================================================

export const INSTRUMENT_TYPES = [
    { value: 'DD', label: 'Demand Draft' },
    { value: 'FDR', label: 'Fixed Deposit Receipt' },
    { value: 'Cheque', label: 'Cheque' },
    { value: 'BG', label: 'Bank Guarantee' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Portal Payment', label: 'Portal Payment' },
];

// ============================================================================
// Request Status (Approval Status from Accounts)
// ============================================================================

export const REQUEST_STATUS = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Requested', label: 'Requested' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Issued', label: 'Issued' },
    { value: 'Dispatched', label: 'Dispatched' },
    { value: 'Received', label: 'Received' },
    { value: 'Returned', label: 'Returned' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Refunded', label: 'Refunded' },
    { value: 'Encashed', label: 'Encashed' },
    { value: 'Extended', label: 'Extended' },
];

export const APPROVAL_STATUS = [
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'DD Requested', label: 'DD Requested' }, // For cheques
];

// ============================================================================
// Action/Stage Constants - Single Source of Truth
// ============================================================================

type ActionRecord = Record<number, string>;
type ActionArray = Array<{ value: number; label: string }>;

function createActionsFromRecord(record: ActionRecord): ActionArray {
    return Object.entries(record).map(([value, label]) => ({
        value: Number(value),
        label,
    }));
}

// DD (Demand Draft) - 7 stages
const DD_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form (DD)',
    2: 'Initiate Followup',
    3: 'Returned via Courier',
    4: 'Returned via Bank Transfer',
    5: 'Settled with Project Account',
    6: 'Send DD Cancellation Request',
    7: 'DD Cancelled at Branch',
};
export const DD_ACTION_LABELS = DD_ACTIONS_RECORD;
export const DD_ACTIONS = createActionsFromRecord(DD_ACTIONS_RECORD);

// FDR (Fixed Deposit Receipt) - 4 stages
const FDR_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form (FDR)',
    2: 'Initiate Followup',
    3: 'Returned via Courier',
    4: 'Returned via Bank Transfer',
};
export const FDR_ACTION_LABELS = FDR_ACTIONS_RECORD;
export const FDR_ACTIONS = createActionsFromRecord(FDR_ACTIONS_RECORD);

// Cheque - 6 stages
const CHEQUE_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form (Cheque)',
    2: 'Initiate Followup',
    3: 'Stop Cheque from Bank',
    4: 'Paid via Bank Transfer',
    5: 'Deposited in Bank',
    6: 'Cancelled/Torn',
};
export const CHEQUE_ACTION_LABELS = CHEQUE_ACTIONS_RECORD;
export const CHEQUE_ACTIONS = createActionsFromRecord(CHEQUE_ACTIONS_RECORD);

// BG (Bank Guarantee) - 9 stages
const BG_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form 1 - Request to Bank',
    2: 'Accounts Form 2 - After BG Creation',
    3: 'Accounts Form 3 - Capture FDR Details',
    4: 'Initiate Followup',
    5: 'Request Extension',
    6: 'Returned via Courier',
    7: 'Request Cancellation',
    8: 'BG Cancellation Confirmation',
    9: 'FDR Cancellation Confirmation',
};
export const BG_ACTION_LABELS = BG_ACTIONS_RECORD;
export const BG_ACTIONS = createActionsFromRecord(BG_ACTIONS_RECORD);

// Bank Transfer - 4 stages
const BANK_TRANSFER_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form (Bank Transfer)',
    2: 'Initiate Followup',
    3: 'Returned via Bank Transfer',
    4: 'Settled with Project Account',
};
export const BANK_TRANSFER_ACTION_LABELS = BANK_TRANSFER_ACTIONS_RECORD;
export const BANK_TRANSFER_ACTIONS = createActionsFromRecord(BANK_TRANSFER_ACTIONS_RECORD);

// Portal Payment - 4 stages
const PORTAL_ACTIONS_RECORD: ActionRecord = {
    1: 'Accounts Form (Portal)',
    2: 'Initiate Followup',
    3: 'Returned via Bank Transfer',
    4: 'Settled with Project Account',
};
export const PORTAL_ACTION_LABELS = PORTAL_ACTIONS_RECORD;
export const PORTAL_ACTIONS = createActionsFromRecord(PORTAL_ACTIONS_RECORD);

// Legacy status aliases for backward compatibility
export const DD_STATUS = DD_ACTIONS;
export const FDR_STATUS = DD_ACTIONS;
export const CHEQUE_STATUS = CHEQUE_ACTIONS;
export const BG_STATUS = BG_ACTIONS;
export const BT_POP_STATUS = BANK_TRANSFER_ACTIONS;

// ============================================================================
// Helper to get actions by instrument type
// ============================================================================

export function getActionsForInstrument(instrumentType: string) {
    switch (instrumentType) {
        case 'DD':
            return DD_ACTIONS;
        case 'FDR':
            return FDR_ACTIONS;
        case 'Cheque':
            return CHEQUE_ACTIONS;
        case 'BG':
            return BG_ACTIONS;
        case 'Bank Transfer':
            return BANK_TRANSFER_ACTIONS;
        case 'Portal Payment':
            return PORTAL_ACTIONS;
        default:
            return [];
    }
}

export function getActionLabel(instrumentType: string, action: number | null): string {
    if (action === null) return 'Not Started';

    switch (instrumentType) {
        case 'DD':
            return DD_ACTION_LABELS[action] || `Action ${action}`;
        case 'FDR':
            return FDR_ACTION_LABELS[action] || `Action ${action}`;
        case 'Cheque':
            return CHEQUE_ACTION_LABELS[action] || `Action ${action}`;
        case 'BG':
            return BG_ACTION_LABELS[action] || `Action ${action}`;
        case 'Bank Transfer':
            return BANK_TRANSFER_ACTION_LABELS[action] || `Action ${action}`;
        case 'Portal Payment':
            return PORTAL_ACTION_LABELS[action] || `Action ${action}`;
        default:
            return `Action ${action}`;
    }
}

export const BANK_LABELS: Record<string, string> = {
    'SBI': 'State Bank of India',
    'HDFC': 'HDFC Bank',
    'ICICI': 'ICICI Bank',
    'YESBANK_2011': 'Yes Bank 2011',
    'YESBANK_0771': 'Yes Bank 0771',
    'PNB': 'Punjab National Bank',
    'BGLIMIT': 'BG Limit',
};

// ============================================================================
// Cheque Banks (for debit)
// ============================================================================

export const CHEQUE_BANKS = [
    { value: 'SBI', label: 'State Bank of India' },
    { value: 'HDFC', label: 'HDFC Bank' },
    { value: 'ICICI', label: 'ICICI Bank' },
    { value: 'YESBANK', label: 'Yes Bank' },
    { value: 'PNB', label: 'Punjab National Bank' },
];

// ============================================================================
// Request Type (for Cheques linked to DD/FDR)
// ============================================================================

export const CHEQUE_REQUEST_TYPES = [
    { value: 'NEW', label: 'New Request' },
    { value: 'DD_LINKED', label: 'Linked to DD' },
    { value: 'FDR_LINKED', label: 'Linked to FDR' },
];


/**
 * Get next available actions for an instrument based on current action
 */
export function getNextActions(instrumentType: string, currentAction: number | null): typeof DD_ACTIONS {
    const allActions = getActionsForInstrument(instrumentType);

    if (currentAction === null) {
        // If no action yet, only show first action (Accounts Form)
        return allActions.filter(a => a.value === 1);
    }

    // Return actions greater than current (sequential workflow)
    // But also include current action for editing
    return allActions.filter(a => a.value >= currentAction);
}

/**
 * Check if an action is a terminal/final action
 */
export function isTerminalAction(instrumentType: string, action: number | null): boolean {
    if (action === null) return false;

    switch (instrumentType) {
        case 'DD':
            return [5, 7].includes(action); // Settled or Cancelled
        case 'FDR':
            return [4].includes(action); // Returned via Bank Transfer
        case 'Cheque':
            return [5, 6].includes(action); // Deposited or Cancelled
        case 'BG':
            return [8, 9].includes(action); // BG/FDR Cancellation Confirmation
        case 'Bank Transfer':
        case 'Portal Payment':
            return [4].includes(action); // Settled
        default:
            return false;
    }
}

/**
 * Get status badge color based on status/action
 */
export function getStatusColor(status: string | null): string {
    if (!status) return 'gray';

    const s = status.toLowerCase();
    if (s.includes('accept') || s.includes('approv') || s.includes('issued')) return 'green';
    if (s.includes('reject') || s.includes('cancel')) return 'red';
    if (s.includes('pending') || s.includes('request')) return 'yellow';
    if (s.includes('return')) return 'blue';
    if (s.includes('extend')) return 'purple';

    return 'gray';
}

/**
 * Get action badge color based on action stage
 */
export function getActionColor(action: number | null): string {
    if (action === null) return 'gray';
    if (action === 1) return 'blue'; // Initial form
    if (action === 2) return 'yellow'; // Followup
    return 'green'; // Further stages
}


export const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === "") return "—";
    return value;
};

export const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "pending") return "secondary";
    if (statusLower === "approved" || statusLower === "received") return "default";
    if (statusLower === "rejected" || statusLower === "cancelled") return "destructive";
    return "outline";
};

export const BI_STATUSES = {
     'DD_ACCOUNTS_FORM_PENDING': 'PENDING',
     'DD_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
     'DD_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
     'DD_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
     'DD_RETURN_VIA_COURIER': 'COURIER_RETURN_RECEIVED',
     'DD_RETURN_VIA_BANK_TRANSFER': 'BANK_RETURN_COMPLETED',
     'DD_SETTLED_WITH_PROJECT': 'PROJECT_SETTLEMENT_COMPLETED',
     'DD_CANCELLATION_REQUESTED': 'CANCELLATION_REQUESTED',
     'DD_CANCELLED_AT_BRANCH': 'CANCELLED_AT_BRANCH',

    'FDR_ACCOUNTS_FORM_PENDING': 'PENDING',
    'FDR_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
    'FDR_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
    'FDR_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
    'FDR_RETURN_VIA_COURIER': 'COURIER_RETURN_RECEIVED',
    'FDR_RETURN_VIA_BANK_TRANSFER': 'BANK_RETURN_COMPLETED',
    'FDR_SETTLED_WITH_PROJECT': 'PROJECT_SETTLEMENT_COMPLETED',
    'FDR_CANCELLATION_REQUESTED': 'CANCELLATION_REQUESTED',
    'FDR_CANCELLED_AT_BRANCH': 'CANCELLED_AT_BRANCH',

    'CHEQUE_ACCOUNTS_FORM_PENDING': 'PENDING',
    'CHEQUE_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
    'CHEQUE_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
    'CHEQUE_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
    'CHEQUE_STOP_FROM_BANK': 'STOP_REQUESTED',
    'CHEQUE_DEPOSITED_IN_BANK': 'DEPOSITED_IN_BANK',
    'CHEQUE_PAID_VIA_BANK_TRANSFER': 'PAID_VIA_BANK_TRANSFER',
    'CHEQUE_CANCELLED_TORN': 'CANCELLED_TORN',

    'BG_ACCOUNTS_FORM_PENDING': 'PENDING',
    'BG_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
    'BG_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
    'BG_CREATED': 'BG_CREATED',
    'BG_FDR_DETAILS_CAPTURED': 'FDR_DETAILS_CAPTURED',
    'BG_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
    'BG_EXTENSION_REQUESTED': 'EXTENSION_REQUESTED',
    'BG_RETURN_VIA_COURIER': 'COURIER_RETURN_RECEIVED',
    'BG_CANCELLATION_REQUESTED': 'CANCELLATION_REQUESTED',
    'BG_BG_CANCELLATION_CONFIRMED': 'BG_CANCELLATION_CONFIRMED',
    'BG_FDR_CANCELLED_CONFIRMED': 'FDR_CANCELLED_CONFIRMED',

    'Bank Transfer_ACCOUNTS_FORM_PENDING': 'PENDING',
    'Bank Transfer_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
    'Bank Transfer_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
    'Bank Transfer_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
    'Bank Transfer_RETURN_VIA_BANK_TRANSFER': 'RETURN_VIA_BANK_TRANSFER',
    'Bank Transfer_SETTLED_WITH_PROJECT': 'SETTLED_WITH_PROJECT',

    'Portal Payment_ACCOUNTS_FORM_PENDING': 'PENDING',
    'Portal Payment_ACCOUNTS_FORM_ACCEPTED': 'ACCOUNTS_FORM_ACCEPTED',
    'Portal Payment_ACCOUNTS_FORM_REJECTED': 'ACCOUNTS_FORM_REJECTED',
    'Portal Payment_FOLLOWUP_INITIATED': 'FOLLOWUP_INITIATED',
    'Portal Payment_RETURN_VIA_BANK_TRANSFER': 'RETURN_VIA_BANK_TRANSFER',
    'Portal Payment_SETTLED_WITH_PROJECT': 'SETTLED_WITH_PROJECT',
} as const;

export const getReadableStatusName = (status: string) => {
  return BI_STATUSES[status as keyof typeof BI_STATUSES]?.replaceAll('_', ' ')
    || status?.replaceAll('_', ' ') || '';
};
