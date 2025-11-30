// ============================================================================
// EMD STATUS CONSTANTS
// ============================================================================

/**
 * Status naming convention: {INSTRUMENT_TYPE}_{STAGE}_{STATE}
 *
 * INSTRUMENT_TYPE: DD, FDR, BG, CHEQUE, BT (Bank Transfer), PORTAL
 * STAGE: ACCOUNTS_FORM, FOLLOWUP, COURIER_RETURN, etc.
 * STATE: PENDING, SUBMITTED, ACCEPTED, REJECTED, COMPLETED, etc.
 */

// ============================================================================
// DD (Demand Draft) STATUSES - 7 Stages
// ============================================================================

export const DD_STATUSES = {
    // Initial
    PENDING: 'DD_PENDING',

    // Stage 1: Accounts Form
    ACCOUNTS_FORM_PENDING: 'DD_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_SUBMITTED: 'DD_ACCOUNTS_FORM_SUBMITTED',
    ACCOUNTS_FORM_ACCEPTED: 'DD_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'DD_ACCOUNTS_FORM_REJECTED',

    // Stage 2: Followup
    FOLLOWUP_INITIATED: 'DD_FOLLOWUP_INITIATED',
    FOLLOWUP_IN_PROGRESS: 'DD_FOLLOWUP_IN_PROGRESS',
    FOLLOWUP_COMPLETED: 'DD_FOLLOWUP_COMPLETED',

    // Stage 3: Returned via Courier
    COURIER_RETURN_INITIATED: 'DD_COURIER_RETURN_INITIATED',
    COURIER_RETURN_DISPATCHED: 'DD_COURIER_RETURN_DISPATCHED',
    COURIER_RETURN_RECEIVED: 'DD_COURIER_RETURN_RECEIVED',

    // Stage 4: Returned via Bank Transfer
    BANK_RETURN_INITIATED: 'DD_BANK_RETURN_INITIATED',
    BANK_RETURN_COMPLETED: 'DD_BANK_RETURN_COMPLETED',

    // Stage 5: Settled with Project
    PROJECT_SETTLEMENT_INITIATED: 'DD_PROJECT_SETTLEMENT_INITIATED',
    PROJECT_SETTLEMENT_COMPLETED: 'DD_PROJECT_SETTLEMENT_COMPLETED',

    // Stage 6: Cancellation Request
    CANCELLATION_REQUESTED: 'DD_CANCELLATION_REQUESTED',
    CANCELLATION_APPROVED: 'DD_CANCELLATION_APPROVED',
    CANCELLATION_REJECTED: 'DD_CANCELLATION_REJECTED',

    // Stage 7: Cancelled at Branch
    CANCELLED_AT_BRANCH: 'DD_CANCELLED_AT_BRANCH',
} as const;

export const DD_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            DD_STATUSES.ACCOUNTS_FORM_PENDING,
            DD_STATUSES.ACCOUNTS_FORM_SUBMITTED,
            DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            DD_STATUSES.ACCOUNTS_FORM_REJECTED,
        ],
        terminalStatuses: [DD_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4, 5, 6],
    },
    2: {
        name: 'Followup',
        statuses: [
            DD_STATUSES.FOLLOWUP_INITIATED,
            DD_STATUSES.FOLLOWUP_IN_PROGRESS,
            DD_STATUSES.FOLLOWUP_COMPLETED,
        ],
        terminalStatuses: [],
        nextStages: [3, 4, 5, 6],
    },
    3: {
        name: 'Returned via Courier',
        statuses: [
            DD_STATUSES.COURIER_RETURN_INITIATED,
            DD_STATUSES.COURIER_RETURN_DISPATCHED,
            DD_STATUSES.COURIER_RETURN_RECEIVED,
        ],
        terminalStatuses: [DD_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    4: {
        name: 'Returned via Bank Transfer',
        statuses: [
            DD_STATUSES.BANK_RETURN_INITIATED,
            DD_STATUSES.BANK_RETURN_COMPLETED,
        ],
        terminalStatuses: [DD_STATUSES.BANK_RETURN_COMPLETED],
        nextStages: [],
    },
    5: {
        name: 'Settled with Project',
        statuses: [
            DD_STATUSES.PROJECT_SETTLEMENT_INITIATED,
            DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
        ],
        terminalStatuses: [DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED],
        nextStages: [],
    },
    6: {
        name: 'Cancellation Request',
        statuses: [
            DD_STATUSES.CANCELLATION_REQUESTED,
            DD_STATUSES.CANCELLATION_APPROVED,
            DD_STATUSES.CANCELLATION_REJECTED,
        ],
        terminalStatuses: [DD_STATUSES.CANCELLATION_REJECTED],
        nextStages: [7],
    },
    7: {
        name: 'Cancelled at Branch',
        statuses: [DD_STATUSES.CANCELLED_AT_BRANCH],
        terminalStatuses: [DD_STATUSES.CANCELLED_AT_BRANCH],
        nextStages: [],
    },
};

// ============================================================================
// FDR STATUSES - 4 Stages
// ============================================================================

export const FDR_STATUSES = {
    PENDING: 'FDR_PENDING',

    // Stage 1
    ACCOUNTS_FORM_PENDING: 'FDR_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_SUBMITTED: 'FDR_ACCOUNTS_FORM_SUBMITTED',
    ACCOUNTS_FORM_ACCEPTED: 'FDR_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'FDR_ACCOUNTS_FORM_REJECTED',

    // Stage 2
    FOLLOWUP_INITIATED: 'FDR_FOLLOWUP_INITIATED',
    FOLLOWUP_COMPLETED: 'FDR_FOLLOWUP_COMPLETED',

    // Stage 3
    COURIER_RETURN_INITIATED: 'FDR_COURIER_RETURN_INITIATED',
    COURIER_RETURN_RECEIVED: 'FDR_COURIER_RETURN_RECEIVED',

    // Stage 4
    BANK_RETURN_INITIATED: 'FDR_BANK_RETURN_INITIATED',
    BANK_RETURN_COMPLETED: 'FDR_BANK_RETURN_COMPLETED',
} as const;

export const FDR_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            FDR_STATUSES.ACCOUNTS_FORM_PENDING,
            FDR_STATUSES.ACCOUNTS_FORM_SUBMITTED,
            FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            FDR_STATUSES.ACCOUNTS_FORM_REJECTED,
        ],
        terminalStatuses: [FDR_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4],
    },
    2: {
        name: 'Followup',
        statuses: [FDR_STATUSES.FOLLOWUP_INITIATED, FDR_STATUSES.FOLLOWUP_COMPLETED],
        terminalStatuses: [],
        nextStages: [3, 4],
    },
    3: {
        name: 'Returned via Courier',
        statuses: [FDR_STATUSES.COURIER_RETURN_INITIATED, FDR_STATUSES.COURIER_RETURN_RECEIVED],
        terminalStatuses: [FDR_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    4: {
        name: 'Returned via Bank Transfer',
        statuses: [FDR_STATUSES.BANK_RETURN_INITIATED, FDR_STATUSES.BANK_RETURN_COMPLETED],
        terminalStatuses: [FDR_STATUSES.BANK_RETURN_COMPLETED],
        nextStages: [],
    },
};

// ============================================================================
// CHEQUE STATUSES - 6 Stages
// ============================================================================

export const CHEQUE_STATUSES = {
    PENDING: 'CHEQUE_PENDING',

    // Stage 1
    ACCOUNTS_FORM_PENDING: 'CHEQUE_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_SUBMITTED: 'CHEQUE_ACCOUNTS_FORM_SUBMITTED',
    ACCOUNTS_FORM_ACCEPTED: 'CHEQUE_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'CHEQUE_ACCOUNTS_FORM_REJECTED',

    // Stage 2
    FOLLOWUP_INITIATED: 'CHEQUE_FOLLOWUP_INITIATED',
    FOLLOWUP_COMPLETED: 'CHEQUE_FOLLOWUP_COMPLETED',

    // Stage 3
    STOP_REQUESTED: 'CHEQUE_STOP_REQUESTED',
    STOP_COMPLETED: 'CHEQUE_STOP_COMPLETED',

    // Stage 4
    BANK_PAYMENT_INITIATED: 'CHEQUE_BANK_PAYMENT_INITIATED',
    BANK_PAYMENT_COMPLETED: 'CHEQUE_BANK_PAYMENT_COMPLETED',

    // Stage 5
    DEPOSIT_INITIATED: 'CHEQUE_DEPOSIT_INITIATED',
    DEPOSIT_COMPLETED: 'CHEQUE_DEPOSIT_COMPLETED',

    // Stage 6
    CANCELLED: 'CHEQUE_CANCELLED',
} as const;

export const CHEQUE_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            CHEQUE_STATUSES.ACCOUNTS_FORM_PENDING,
            CHEQUE_STATUSES.ACCOUNTS_FORM_SUBMITTED,
            CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED,
        ],
        terminalStatuses: [CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4, 5, 6],
    },
    2: {
        name: 'Followup',
        statuses: [CHEQUE_STATUSES.FOLLOWUP_INITIATED, CHEQUE_STATUSES.FOLLOWUP_COMPLETED],
        terminalStatuses: [],
        nextStages: [3, 4, 5, 6],
    },
    3: {
        name: 'Stop Cheque',
        statuses: [CHEQUE_STATUSES.STOP_REQUESTED, CHEQUE_STATUSES.STOP_COMPLETED],
        terminalStatuses: [CHEQUE_STATUSES.STOP_COMPLETED],
        nextStages: [4, 6],
    },
    4: {
        name: 'Paid via Bank Transfer',
        statuses: [CHEQUE_STATUSES.BANK_PAYMENT_INITIATED, CHEQUE_STATUSES.BANK_PAYMENT_COMPLETED],
        terminalStatuses: [CHEQUE_STATUSES.BANK_PAYMENT_COMPLETED],
        nextStages: [],
    },
    5: {
        name: 'Deposited in Bank',
        statuses: [CHEQUE_STATUSES.DEPOSIT_INITIATED, CHEQUE_STATUSES.DEPOSIT_COMPLETED],
        terminalStatuses: [CHEQUE_STATUSES.DEPOSIT_COMPLETED],
        nextStages: [],
    },
    6: {
        name: 'Cancelled/Torn',
        statuses: [CHEQUE_STATUSES.CANCELLED],
        terminalStatuses: [CHEQUE_STATUSES.CANCELLED],
        nextStages: [],
    },
};

// ============================================================================
// BG (Bank Guarantee) STATUSES - 9 Stages
// ============================================================================

export const BG_STATUSES = {
    PENDING: 'BG_PENDING',

    // Stage 1: Request to Bank
    BANK_REQUEST_PENDING: 'BG_BANK_REQUEST_PENDING',
    BANK_REQUEST_SUBMITTED: 'BG_BANK_REQUEST_SUBMITTED',
    BANK_REQUEST_ACCEPTED: 'BG_BANK_REQUEST_ACCEPTED',
    BANK_REQUEST_REJECTED: 'BG_BANK_REQUEST_REJECTED',

    // Stage 2: BG Created
    BG_CREATION_PENDING: 'BG_CREATION_PENDING',
    BG_CREATED: 'BG_CREATED',

    // Stage 3: FDR Details Captured
    FDR_CAPTURE_PENDING: 'BG_FDR_CAPTURE_PENDING',
    FDR_CAPTURED: 'BG_FDR_CAPTURED',

    // Stage 4: Followup
    FOLLOWUP_INITIATED: 'BG_FOLLOWUP_INITIATED',
    FOLLOWUP_COMPLETED: 'BG_FOLLOWUP_COMPLETED',

    // Stage 5: Extension
    EXTENSION_REQUESTED: 'BG_EXTENSION_REQUESTED',
    EXTENSION_APPROVED: 'BG_EXTENSION_APPROVED',
    EXTENSION_REJECTED: 'BG_EXTENSION_REJECTED',
    EXTENSION_COMPLETED: 'BG_EXTENSION_COMPLETED',

    // Stage 6: Returned via Courier
    COURIER_RETURN_INITIATED: 'BG_COURIER_RETURN_INITIATED',
    COURIER_RETURN_DISPATCHED: 'BG_COURIER_RETURN_DISPATCHED',
    COURIER_RETURN_RECEIVED: 'BG_COURIER_RETURN_RECEIVED',

    // Stage 7: Cancellation Request
    CANCELLATION_REQUESTED: 'BG_CANCELLATION_REQUESTED',
    CANCELLATION_APPROVED: 'BG_CANCELLATION_APPROVED',
    CANCELLATION_REJECTED: 'BG_CANCELLATION_REJECTED',

    // Stage 8: BG Cancelled
    BG_CANCELLATION_CONFIRMED: 'BG_CANCELLATION_CONFIRMED',

    // Stage 9: FDR Cancelled
    FDR_CANCELLATION_CONFIRMED: 'BG_FDR_CANCELLATION_CONFIRMED',
} as const;

export const BG_STAGES = {
    1: {
        name: 'Accounts Form 1 - Request to Bank',
        statuses: [
            BG_STATUSES.BANK_REQUEST_PENDING,
            BG_STATUSES.BANK_REQUEST_SUBMITTED,
            BG_STATUSES.BANK_REQUEST_ACCEPTED,
            BG_STATUSES.BANK_REQUEST_REJECTED,
        ],
        terminalStatuses: [BG_STATUSES.BANK_REQUEST_REJECTED],
        nextStages: [2],
    },
    2: {
        name: 'Accounts Form 2 - After BG Creation',
        statuses: [BG_STATUSES.BG_CREATION_PENDING, BG_STATUSES.BG_CREATED],
        terminalStatuses: [],
        nextStages: [3, 4, 5, 6, 7],
    },
    3: {
        name: 'Accounts Form 3 - Capture FDR Details',
        statuses: [BG_STATUSES.FDR_CAPTURE_PENDING, BG_STATUSES.FDR_CAPTURED],
        terminalStatuses: [],
        nextStages: [4, 5, 6, 7],
    },
    4: {
        name: 'Followup',
        statuses: [BG_STATUSES.FOLLOWUP_INITIATED, BG_STATUSES.FOLLOWUP_COMPLETED],
        terminalStatuses: [],
        nextStages: [5, 6, 7],
    },
    5: {
        name: 'Extension',
        statuses: [
            BG_STATUSES.EXTENSION_REQUESTED,
            BG_STATUSES.EXTENSION_APPROVED,
            BG_STATUSES.EXTENSION_REJECTED,
            BG_STATUSES.EXTENSION_COMPLETED,
        ],
        terminalStatuses: [BG_STATUSES.EXTENSION_REJECTED],
        nextStages: [4, 6, 7],
    },
    6: {
        name: 'Returned via Courier',
        statuses: [
            BG_STATUSES.COURIER_RETURN_INITIATED,
            BG_STATUSES.COURIER_RETURN_DISPATCHED,
            BG_STATUSES.COURIER_RETURN_RECEIVED,
        ],
        terminalStatuses: [BG_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    7: {
        name: 'Cancellation Request',
        statuses: [
            BG_STATUSES.CANCELLATION_REQUESTED,
            BG_STATUSES.CANCELLATION_APPROVED,
            BG_STATUSES.CANCELLATION_REJECTED,
        ],
        terminalStatuses: [BG_STATUSES.CANCELLATION_REJECTED],
        nextStages: [8],
    },
    8: {
        name: 'BG Cancellation Confirmation',
        statuses: [BG_STATUSES.BG_CANCELLATION_CONFIRMED],
        terminalStatuses: [BG_STATUSES.BG_CANCELLATION_CONFIRMED],
        nextStages: [9],
    },
    9: {
        name: 'FDR Cancellation Confirmation',
        statuses: [BG_STATUSES.FDR_CANCELLATION_CONFIRMED],
        terminalStatuses: [BG_STATUSES.FDR_CANCELLATION_CONFIRMED],
        nextStages: [],
    },
};

// ============================================================================
// BANK TRANSFER STATUSES - 4 Stages
// ============================================================================

export const BT_STATUSES = {
    PENDING: 'BT_PENDING',

    // Stage 1
    ACCOUNTS_FORM_PENDING: 'BT_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_SUBMITTED: 'BT_ACCOUNTS_FORM_SUBMITTED',
    ACCOUNTS_FORM_ACCEPTED: 'BT_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'BT_ACCOUNTS_FORM_REJECTED',
    PAYMENT_COMPLETED: 'BT_PAYMENT_COMPLETED',

    // Stage 2
    FOLLOWUP_INITIATED: 'BT_FOLLOWUP_INITIATED',
    FOLLOWUP_COMPLETED: 'BT_FOLLOWUP_COMPLETED',

    // Stage 3
    RETURN_INITIATED: 'BT_RETURN_INITIATED',
    RETURN_COMPLETED: 'BT_RETURN_COMPLETED',

    // Stage 4
    SETTLED: 'BT_SETTLED',
} as const;

export const BT_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            BT_STATUSES.ACCOUNTS_FORM_PENDING,
            BT_STATUSES.ACCOUNTS_FORM_SUBMITTED,
            BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            BT_STATUSES.ACCOUNTS_FORM_REJECTED,
            BT_STATUSES.PAYMENT_COMPLETED,
        ],
        terminalStatuses: [BT_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4],
    },
    2: {
        name: 'Followup',
        statuses: [BT_STATUSES.FOLLOWUP_INITIATED, BT_STATUSES.FOLLOWUP_COMPLETED],
        terminalStatuses: [],
        nextStages: [3, 4],
    },
    3: {
        name: 'Returned via Bank Transfer',
        statuses: [BT_STATUSES.RETURN_INITIATED, BT_STATUSES.RETURN_COMPLETED],
        terminalStatuses: [BT_STATUSES.RETURN_COMPLETED],
        nextStages: [],
    },
    4: {
        name: 'Settled with Project',
        statuses: [BT_STATUSES.SETTLED],
        terminalStatuses: [BT_STATUSES.SETTLED],
        nextStages: [],
    },
};

// ============================================================================
// PORTAL PAYMENT STATUSES - 4 Stages
// ============================================================================

export const PORTAL_STATUSES = {
    PENDING: 'PORTAL_PENDING',

    // Stage 1
    ACCOUNTS_FORM_PENDING: 'PORTAL_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_SUBMITTED: 'PORTAL_ACCOUNTS_FORM_SUBMITTED',
    ACCOUNTS_FORM_ACCEPTED: 'PORTAL_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'PORTAL_ACCOUNTS_FORM_REJECTED',
    PAYMENT_COMPLETED: 'PORTAL_PAYMENT_COMPLETED',

    // Stage 2
    FOLLOWUP_INITIATED: 'PORTAL_FOLLOWUP_INITIATED',
    FOLLOWUP_COMPLETED: 'PORTAL_FOLLOWUP_COMPLETED',

    // Stage 3
    RETURN_INITIATED: 'PORTAL_RETURN_INITIATED',
    RETURN_COMPLETED: 'PORTAL_RETURN_COMPLETED',

    // Stage 4
    SETTLED: 'PORTAL_SETTLED',
} as const;

export const PORTAL_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            PORTAL_STATUSES.ACCOUNTS_FORM_PENDING,
            PORTAL_STATUSES.ACCOUNTS_FORM_SUBMITTED,
            PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED,
            PORTAL_STATUSES.PAYMENT_COMPLETED,
        ],
        terminalStatuses: [PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4],
    },
    2: {
        name: 'Followup',
        statuses: [PORTAL_STATUSES.FOLLOWUP_INITIATED, PORTAL_STATUSES.FOLLOWUP_COMPLETED],
        terminalStatuses: [],
        nextStages: [3, 4],
    },
    3: {
        name: 'Returned via Bank Transfer',
        statuses: [PORTAL_STATUSES.RETURN_INITIATED, PORTAL_STATUSES.RETURN_COMPLETED],
        terminalStatuses: [PORTAL_STATUSES.RETURN_COMPLETED],
        nextStages: [],
    },
    4: {
        name: 'Settled with Project',
        statuses: [PORTAL_STATUSES.SETTLED],
        terminalStatuses: [PORTAL_STATUSES.SETTLED],
        nextStages: [],
    },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export type InstrumentType = 'DD' | 'FDR' | 'BG' | 'Cheque' | 'Bank Transfer' | 'Portal Payment';

export function getStatusesForInstrument(instrumentType: InstrumentType) {
    switch (instrumentType) {
        case 'DD':
            return DD_STATUSES;
        case 'FDR':
            return FDR_STATUSES;
        case 'BG':
            return BG_STATUSES;
        case 'Cheque':
            return CHEQUE_STATUSES;
        case 'Bank Transfer':
            return BT_STATUSES;
        case 'Portal Payment':
            return PORTAL_STATUSES;
        default:
            return {};
    }
}

export function getStagesForInstrument(instrumentType: InstrumentType) {
    switch (instrumentType) {
        case 'DD':
            return DD_STAGES;
        case 'FDR':
            return FDR_STAGES;
        case 'BG':
            return BG_STAGES;
        case 'Cheque':
            return CHEQUE_STAGES;
        case 'Bank Transfer':
            return BT_STAGES;
        case 'Portal Payment':
            return PORTAL_STAGES;
        default:
            return {};
    }
}

export function isTerminalStatus(instrumentType: InstrumentType, status: string): boolean {
    const stages = getStagesForInstrument(instrumentType);
    for (const stage of Object.values(stages as Record<string, any>)) {
        if (
            stage &&
            Array.isArray((stage as any).terminalStatuses) &&
            (stage as any).terminalStatuses.includes(status)
        ) {
            return true;
        }
    }
    return false;
}

export function isRejectedStatus(status: string): boolean {
    return status.endsWith('_REJECTED');
}

export function getStageFromStatus(instrumentType: InstrumentType, status: string): number | null {
    const stages = getStagesForInstrument(instrumentType);
    for (const [stageNum, stageConfig] of Object.entries(stages as Record<string, any>)) {
        if (stageConfig && Array.isArray(stageConfig.statuses) && stageConfig.statuses.includes(status)) {
            return parseInt(stageNum);
        }
    }
    return null;
}

export function getNextAvailableStages(
    instrumentType: InstrumentType,
    currentStatus: string
): number[] {
    const stages = getStagesForInstrument(instrumentType);
    const currentStage = getStageFromStatus(instrumentType, currentStatus);

    if (!currentStage) return [];

    const stageConfig = stages[currentStage as keyof typeof stages];
    if (!stageConfig) return [];

    // If current status is terminal, no next stages
    if (stageConfig && Array.isArray((stageConfig as Record<string, any>).terminalStatuses) && (stageConfig as Record<string, any>).terminalStatuses.includes(currentStatus)) {
        return [];
    }

    return stageConfig && Array.isArray((stageConfig as Record<string, any>).nextStages) ? (stageConfig as Record<string, any>).nextStages : [];
}

export function getStatusLabel(status: string): string {
    // Convert SCREAMING_SNAKE_CASE to Title Case
    // e.g., DD_ACCOUNTS_FORM_PENDING -> Accounts Form Pending
    const withoutPrefix = status.replace(/^(DD|FDR|BG|CHEQUE|BT|PORTAL)_/, '');
    return withoutPrefix
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function getStatusColor(status: string): string {
    if (status.endsWith('_REJECTED')) return 'red';
    if (status.endsWith('_ACCEPTED') || status.endsWith('_APPROVED')) return 'green';
    if (status.endsWith('_COMPLETED') || status.endsWith('_RECEIVED')) return 'green';
    if (status.endsWith('_CONFIRMED') || status.endsWith('_SETTLED')) return 'green';
    if (status.endsWith('_CANCELLED')) return 'gray';
    if (status.endsWith('_PENDING')) return 'yellow';
    if (status.endsWith('_SUBMITTED') || status.endsWith('_INITIATED')) return 'blue';
    if (status.endsWith('_IN_PROGRESS') || status.endsWith('_DISPATCHED')) return 'blue';
    return 'gray';
}
