// Payment modes - use string identifiers that match backend
export const EMD_MODE_VALUES = {
    POP: 'POP',
    BT: 'BT',
    DD: 'DD',
    BG: 'BG',
    FDR: 'FDR',
    CHEQUE: 'CHEQUE',
    NA: 'NA',
} as const;

export const EMD_MODES = [
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
    { value: 'DD', label: 'Demand Draft' },
    { value: 'BG', label: 'Bank Guarantee' },
    { value: 'FDR', label: 'Fixed Deposit Receipt' },
    { value: 'CHEQUE', label: 'Cheque' },
];

export const TENDER_FEE_MODES = [
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
    { value: 'DD', label: 'Demand Draft' },
];

export const PROCESSING_FEE_MODES = [
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
    { value: 'DD', label: 'Demand Draft' },
];

// Legacy mode mapping (database stores numeric, we need to convert)
export const MODE_VALUE_MAP: Record<string, string> = {
    '1': 'POP',
    '2': 'BT',
    '3': 'DD',
    '4': 'BG',
    '5': 'FDR',
    '6': 'CHEQUE',
    'POP': 'POP',
    'BT': 'BT',
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
    'BT': 'Bank Transfer',
    'POP': 'Payment on Portal',
};

export const PURPOSE_OPTIONS = [
    { value: 'EMD', label: 'EMD' },
    { value: 'TENDER_FEES', label: 'Tender Fees' },
    { value: 'PROCESSING_FEE', label: 'Processing Fee' },
    { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
    { value: 'OTHER_PAYMENT', label: 'Other Payment' },
    { value: 'OTHER_SECURITY', label: 'Other Security' },
];

export const BG_PURPOSE_OPTIONS = [
    { value: 'EMD', label: 'EMD (Bid Bond)' },
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
    { value: '72', label: '72 Hours' },
    { value: '96', label: '96 Hours' },
    { value: '120', label: '120 Hours' },
];

export const BG_NEEDED_IN_OPTIONS = [
    { value: '48', label: '48 Hours' },
    { value: '72', label: '72 Hours' },
    { value: '96', label: '96 Hours' },
    { value: '120', label: '120 Hours' },
];

export const BANKS = [
    { value: 'SBI', label: 'State Bank of India' },
    { value: 'HDFC', label: 'HDFC Bank' },
    { value: 'ICICI', label: 'ICICI Bank' },
    { value: 'YESBANK_2011', label: 'Yes Bank 2011' },
    { value: 'YESBANK_0771', label: 'Yes Bank 0771' },
    { value: 'PNB', label: 'Punjab National Bank' },
    { value: 'BGLIMIT', label: 'BG Limit' },
];

export const YES_NO_OPTIONS = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
];

export const DD_STATUS = [
    { value: '1', label: 'Accounts Form (DD)' },
    { value: '2', label: 'Initiate Followup' },
    { value: '3', label: 'Returned via Courier' },
    { value: '4', label: 'Returned via Bank Transfer' },
    { value: '5', label: 'Settled with Project Account' },
    { value: '6', label: 'Send DD Cancellation Request' },
    { value: '7', label: 'DD Cancelled at Branch' },
];

export const FDR_STATUS = [
    { value: '1', label: 'Accounts Form (FDR)' },
    { value: '2', label: 'Initiate Followup' },
    { value: '3', label: 'Returned via Courier' },
    { value: '4', label: 'Returned via Bank Transfer' },
    { value: '5', label: 'Settled with Project Account' },
    { value: '6', label: 'Send FDR Cancellation Request' },
    { value: '7', label: 'FDR Cancelled at Branch' },
];

export const CHEQUE_STATUS = [
    { value: '1', label: 'Accounts Form' },
    { value: '2', label: 'Initiate Followup' },
    { value: '3', label: 'Stop the cheque from the bank' },
    { value: '4', label: 'Paid via Bank Transfer' },
    { value: '5', label: 'Deposited in Bank' },
    { value: '6', label: 'Cancelled/Torned' },
];

export const BG_STATUS = [
    { value: '1', label: 'Accounts Form 1 - Request to Bank' },
    { value: '2', label: 'Accounts Form 2 - After BG Creation' },
    { value: '3', label: 'Accounts Form 3 - Capture FDR Details' },
    { value: '4', label: 'Initiate Followup' },
    { value: '5', label: 'Request Extension' },
    { value: '6', label: 'Returned via Courier' },
    { value: '7', label: 'Request Cancellation' },
    { value: '8', label: 'BG Cancellation Confirmation' },
    { value: '9', label: 'FDR Cancellation Confirmation' },
];

export const BT_POP_STATUS = [
    { value: '1', label: 'Accounts Form' },
    { value: '2', label: 'Initiate Followup' },
    { value: '3', label: 'Returned via Bank Transfer' },
    { value: '4', label: 'Settled with Project Account' },
];

// Helper to normalize mode values from database
export function normalizeModeValue(mode: string | null | undefined): string {
    if (!mode) return '';
    return MODE_VALUE_MAP[mode] || mode.toUpperCase();
}

// Helper to get allowed modes from comma-separated string or array
export function parseAllowedModes(modes: string | string[] | null | undefined): string[] {
    if (!modes) return [];

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
// Action/Stage Constants - Per Instrument Type
// ============================================================================

/**
 * DD (Demand Draft) Actions/Stages
 * Database: action column values 1-7, null
 */
export const DD_ACTIONS = [
    { value: 1, label: 'Accounts Form (DD)' },
    { value: 2, label: 'Initiate Followup' },
    { value: 3, label: 'Returned via Courier' },
    { value: 4, label: 'Returned via Bank Transfer' },
    { value: 5, label: 'Settled with Project Account' },
    { value: 6, label: 'Send DD Cancellation Request' },
    { value: 7, label: 'DD Cancelled at Branch' },
];

export const DD_ACTION_LABELS: Record<number, string> = {
    1: 'Accounts Form (DD)',
    2: 'Initiate Followup',
    3: 'Returned via Courier',
    4: 'Returned via Bank Transfer',
    5: 'Settled with Project Account',
    6: 'Send DD Cancellation Request',
    7: 'DD Cancelled at Branch',
};

/**
 * FDR (Fixed Deposit Receipt) Actions/Stages
 * Database: action column values 1-4, null
 */
export const FDR_ACTIONS = [
    { value: 1, label: 'Accounts Form (FDR)' },
    { value: 2, label: 'Initiate Followup' },
    { value: 3, label: 'Returned via Courier' },
    { value: 4, label: 'Returned via Bank Transfer' },
];

export const FDR_ACTION_LABELS: Record<number, string> = {
    1: 'Accounts Form (FDR)',
    2: 'Initiate Followup',
    3: 'Returned via Courier',
    4: 'Returned via Bank Transfer',
};

/**
 * Cheque Actions/Stages
 * Database: action column values 1-6, null
 */
export const CHEQUE_ACTIONS = [
    { value: 1, label: 'Accounts Form (Cheque)' },
    { value: 2, label: 'Initiate Followup' },
    { value: 3, label: 'Stop Cheque from Bank' },
    { value: 4, label: 'Paid via Bank Transfer' },
    { value: 5, label: 'Deposited in Bank' },
    { value: 6, label: 'Cancelled/Torn' },
];

export const CHEQUE_ACTION_LABELS: Record<number, string> = {
    1: 'Accounts Form (Cheque)',
    2: 'Initiate Followup',
    3: 'Stop Cheque from Bank',
    4: 'Paid via Bank Transfer',
    5: 'Deposited in Bank',
    6: 'Cancelled/Torn',
};

/**
 * BG (Bank Guarantee) Actions/Stages
 * Database: action column values 1-9, null
 */
export const BG_ACTIONS = [
    { value: 1, label: 'Accounts Form 1 - Request to Bank' },
    { value: 2, label: 'Accounts Form 2 - After BG Creation' },
    { value: 3, label: 'Accounts Form 3 - Capture FDR Details' },
    { value: 4, label: 'Initiate Followup' },
    { value: 5, label: 'Request Extension' },
    { value: 6, label: 'Returned via Courier' },
    { value: 7, label: 'Request Cancellation' },
    { value: 8, label: 'BG Cancellation Confirmation' },
    { value: 9, label: 'FDR Cancellation Confirmation' },
];

export const BG_ACTION_LABELS: Record<number, string> = {
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

/**
 * Bank Transfer Actions/Stages
 * Database: action column values 1-4, null
 */
export const BANK_TRANSFER_ACTIONS = [
    { value: 1, label: 'Accounts Form (Bank Transfer)' },
    { value: 2, label: 'Initiate Followup' },
    { value: 3, label: 'Returned via Bank Transfer' },
    { value: 4, label: 'Settled with Project Account' },
];

export const BANK_TRANSFER_ACTION_LABELS: Record<number, string> = {
    1: 'Accounts Form (Bank Transfer)',
    2: 'Initiate Followup',
    3: 'Returned via Bank Transfer',
    4: 'Settled with Project Account',
};

/**
 * Portal Payment Actions/Stages
 * Database: action column values 1-4, null
 */
export const PORTAL_ACTIONS = [
    { value: 1, label: 'Accounts Form (Portal)' },
    { value: 2, label: 'Initiate Followup' },
    { value: 3, label: 'Returned via Bank Transfer' },
    { value: 4, label: 'Settled with Project Account' },
];

export const PORTAL_ACTION_LABELS: Record<number, string> = {
    1: 'Accounts Form (Portal)',
    2: 'Initiate Followup',
    3: 'Returned via Bank Transfer',
    4: 'Settled with Project Account',
};

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
