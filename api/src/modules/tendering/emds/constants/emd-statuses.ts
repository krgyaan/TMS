// ============================================================================
// DD (Demand Draft) STATUSES - 7 Stages
// ============================================================================

export const DD_STATUSES = {
    PENDING: 'DD_REQUESTED',
    ACCOUNTS_FORM_ACCEPTED: 'DD_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'DD_ACCOUNTS_FORM_REJECTED',
    FOLLOWUP_INITIATED: 'DD_FOLLOWUP_INITIATED',
    COURIER_RETURN_RECEIVED: 'DD_RETURN_VIA_COURIER',
    BANK_RETURN_COMPLETED: 'DD_RETURN_VIA_BANK_TRANSFER',
    PROJECT_SETTLEMENT_COMPLETED: 'DD_SETTLED_WITH_PROJECT',
    CANCELLATION_REQUESTED: 'DD_CANCELLATION_REQUESTED',
    CANCELLED_AT_BRANCH: 'DD_CANCELLED_AT_BRANCH',
} as const;

export const DD_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            DD_STATUSES.PENDING,
            DD_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            DD_STATUSES.ACCOUNTS_FORM_REJECTED,
            DD_STATUSES.FOLLOWUP_INITIATED,
            DD_STATUSES.COURIER_RETURN_RECEIVED,
            DD_STATUSES.BANK_RETURN_COMPLETED,
            DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
            DD_STATUSES.CANCELLATION_REQUESTED,
            DD_STATUSES.CANCELLED_AT_BRANCH,
        ],
        terminalStatuses: [DD_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4, 5, 6],
    },
    2: {
        name: 'Followup',
        statuses: [
            DD_STATUSES.FOLLOWUP_INITIATED,
        ],
        terminalStatuses: [DD_STATUSES.FOLLOWUP_INITIATED],
        nextStages: [3, 4, 5, 6],
    },
    3: {
        name: 'Returned via Courier',
        statuses: [
            DD_STATUSES.COURIER_RETURN_RECEIVED,
        ],
        terminalStatuses: [DD_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    4: {
        name: 'Returned via Bank Transfer',
        statuses: [
            DD_STATUSES.BANK_RETURN_COMPLETED,
        ],
        terminalStatuses: [DD_STATUSES.BANK_RETURN_COMPLETED],
        nextStages: [],
    },
    5: {
        name: 'Settled with Project',
        statuses: [
            DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
        ],
        terminalStatuses: [DD_STATUSES.PROJECT_SETTLEMENT_COMPLETED],
        nextStages: [],
    },
    6: {
        name: 'Cancellation Request',
        statuses: [
            DD_STATUSES.CANCELLATION_REQUESTED,
        ],
        terminalStatuses: [],
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
// FDR STATUSES - 7 Stages
// ============================================================================

export const FDR_STATUSES = {
    PENDING: 'FDR_REQUESTED',
    ACCOUNTS_FORM_ACCEPTED: 'FDR_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'FDR_ACCOUNTS_FORM_REJECTED',
    FOLLOWUP_INITIATED: 'FDR_FOLLOWUP_INITIATED',
    COURIER_RETURN_RECEIVED: 'FDR_RETURN_VIA_COURIER',
    BANK_RETURN_COMPLETED: 'FDR_RETURN_VIA_BANK_TRANSFER',
    PROJECT_SETTLEMENT_COMPLETED: 'FDR_SETTLED_WITH_PROJECT',
    CANCELLATION_REQUESTED: 'FDR_CANCELLATION_REQUESTED',
    CANCELLED_AT_BRANCH: 'FDR_CANCELLED_AT_BRANCH',
} as const;

export const FDR_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            FDR_STATUSES.PENDING,
            FDR_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            FDR_STATUSES.ACCOUNTS_FORM_REJECTED,
            FDR_STATUSES.FOLLOWUP_INITIATED,
            FDR_STATUSES.COURIER_RETURN_RECEIVED,
            FDR_STATUSES.BANK_RETURN_COMPLETED,
            FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
            FDR_STATUSES.CANCELLATION_REQUESTED,
            FDR_STATUSES.CANCELLED_AT_BRANCH,
        ],
        terminalStatuses: [FDR_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4, 5, 6],
    },
    2: {
        name: 'Followup',
        statuses: [
            FDR_STATUSES.FOLLOWUP_INITIATED,
        ],
        terminalStatuses: [FDR_STATUSES.FOLLOWUP_INITIATED],
        nextStages: [3, 4, 5, 6],
    },
    3: {
        name: 'Returned via Courier',
        statuses: [FDR_STATUSES.COURIER_RETURN_RECEIVED],
        terminalStatuses: [FDR_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    4: {
        name: 'Returned via Bank Transfer',
        statuses: [FDR_STATUSES.BANK_RETURN_COMPLETED],
        terminalStatuses: [FDR_STATUSES.BANK_RETURN_COMPLETED],
        nextStages: [],
    },
    5: {
        name: 'Settled with Project',
        statuses: [
            FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED,
        ],
        terminalStatuses: [FDR_STATUSES.PROJECT_SETTLEMENT_COMPLETED],
        nextStages: [],
    },
    6: {
        name: 'Cancellation Request',
        statuses: [
            FDR_STATUSES.CANCELLATION_REQUESTED,
        ],
        terminalStatuses: [],
        nextStages: [7],
    },
    7: {
        name: 'Cancelled at Branch',
        statuses: [FDR_STATUSES.CANCELLED_AT_BRANCH],
        terminalStatuses: [FDR_STATUSES.CANCELLED_AT_BRANCH],
        nextStages: [],
    },
};

// ============================================================================
// CHEQUE STATUSES - 6 Stages
// ============================================================================

export const CHEQUE_STATUSES = {
    PENDING: 'CHEQUE_REQUESTED',
    ACCOUNTS_FORM_ACCEPTED: 'CHEQUE_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'CHEQUE_ACCOUNTS_FORM_REJECTED',
    FOLLOWUP_INITIATED: 'CHEQUE_FOLLOWUP_INITIATED',
    STOP_REQUESTED: 'CHEQUE_STOP_FROM_BANK',
    DEPOSITED_IN_BANK: 'CHEQUE_DEPOSITED_IN_BANK',
    PAID_VIA_BANK_TRANSFER: 'CHEQUE_PAID_VIA_BANK_TRANSFER',
    CANCELLED_TORN: 'CHEQUE_CANCELLED_TORN',
} as const;

export const CHEQUE_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            CHEQUE_STATUSES.PENDING,
            CHEQUE_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED,
        ],
        terminalStatuses: [CHEQUE_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4, 5, 6],
    },
    2: {
        name: 'Followup',
        statuses: [CHEQUE_STATUSES.FOLLOWUP_INITIATED],
        terminalStatuses: [],
        nextStages: [3, 4, 5, 6],
    },
    3: {
        name: 'Stop Cheque',
        statuses: [CHEQUE_STATUSES.STOP_REQUESTED],
        terminalStatuses: [CHEQUE_STATUSES.STOP_REQUESTED],
        nextStages: [4, 6],
    },
    4: {
        name: 'Paid via Bank Transfer',
        statuses: [CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER],
        terminalStatuses: [CHEQUE_STATUSES.PAID_VIA_BANK_TRANSFER],
        nextStages: [],
    },
    5: {
        name: 'Deposited in Bank',
        statuses: [CHEQUE_STATUSES.DEPOSITED_IN_BANK],
        terminalStatuses: [CHEQUE_STATUSES.DEPOSITED_IN_BANK],
        nextStages: [],
    },
    6: {
        name: 'Cancelled/Torn',
        statuses: [CHEQUE_STATUSES.CANCELLED_TORN],
        terminalStatuses: [],
        nextStages: [],
    },
};

// ============================================================================
// BG (Bank Guarantee) STATUSES - 9 Stages
// ============================================================================

export const BG_STATUSES = {
    PENDING: 'BG_REQUESTED',
    BANK_REQUEST_ACCEPTED: 'BG_BANK_REQUEST_ACCEPTED',
    BANK_REQUEST_REJECTED: 'BG_BANK_REQUEST_REJECTED',
    BG_CREATED: 'BG_CREATED',
    FDR_CAPTURED: 'BG_FDR_CAPTURED',
    FOLLOWUP_INITIATED: 'BG_FOLLOWUP_INITIATED',
    EXTENSION_REQUESTED: 'BG_EXTENSION_REQUESTED',
    COURIER_RETURN_RECEIVED: 'BG_RETURN_VIA_COURIER',
    CANCELLATION_REQUESTED: 'BG_CANCELLATION_REQUESTED',
    BG_CANCELLATION_CONFIRMED: 'BG_CANCELLATION_CONFIRMED',
    FDR_CANCELLATION_CONFIRMED: 'BG_FDR_CANCELLATION_CONFIRMED',
} as const;

export const BG_STAGES = {
    1: {
        name: 'Accounts Form 1 - Request to Bank',
        statuses: [
            BG_STATUSES.PENDING,
            BG_STATUSES.BANK_REQUEST_ACCEPTED,
            BG_STATUSES.BANK_REQUEST_REJECTED,
            BG_STATUSES.BG_CREATED,
            BG_STATUSES.FDR_CAPTURED,
            BG_STATUSES.FOLLOWUP_INITIATED,
            BG_STATUSES.EXTENSION_REQUESTED,
            BG_STATUSES.COURIER_RETURN_RECEIVED,
            BG_STATUSES.CANCELLATION_REQUESTED,
            BG_STATUSES.BG_CANCELLATION_CONFIRMED,
            BG_STATUSES.FDR_CANCELLATION_CONFIRMED,
        ],
        terminalStatuses: [BG_STATUSES.BANK_REQUEST_REJECTED, BG_STATUSES.BG_CANCELLATION_CONFIRMED, BG_STATUSES.FDR_CANCELLATION_CONFIRMED],
        nextStages: [2],
    },
    2: {
        name: 'Accounts Form 2 - After BG Creation',
        statuses: [BG_STATUSES.BG_CREATED],
        terminalStatuses: [],
        nextStages: [3, 4, 5, 6, 7],
    },
    3: {
        name: 'Accounts Form 3 - Capture FDR Details',
        statuses: [BG_STATUSES.FDR_CAPTURED],
        terminalStatuses: [],
        nextStages: [4, 5, 6, 7],
    },
    4: {
        name: 'Followup',
        statuses: [BG_STATUSES.FOLLOWUP_INITIATED],
        terminalStatuses: [],
        nextStages: [5, 6, 7],
    },
    5: {
        name: 'Extension',
        statuses: [
            BG_STATUSES.EXTENSION_REQUESTED,
        ],
        terminalStatuses: [BG_STATUSES.EXTENSION_REQUESTED],
        nextStages: [4, 6, 7],
    },
    6: {
        name: 'Returned via Courier',
        statuses: [
            BG_STATUSES.COURIER_RETURN_RECEIVED,
        ],
        terminalStatuses: [BG_STATUSES.COURIER_RETURN_RECEIVED],
        nextStages: [],
    },
    7: {
        name: 'Cancellation Request',
        statuses: [
            BG_STATUSES.CANCELLATION_REQUESTED,
        ],
        terminalStatuses: [],
        nextStages: [8],
    },
    8: {
        name: 'BG Cancellation Confirmation',
        statuses: [BG_STATUSES.BG_CANCELLATION_CONFIRMED],
        terminalStatuses: [],
        nextStages: [9],
    },
    9: {
        name: 'FDR Cancellation Confirmation',
        statuses: [BG_STATUSES.FDR_CANCELLATION_CONFIRMED],
        terminalStatuses: [],
        nextStages: [],
    },
};

// ============================================================================
// BANK TRANSFER STATUSES - 4 Stages
// ============================================================================

export const BT_STATUSES = {
    PENDING: 'BT_ACCOUNTS_FORM_PENDING',
    ACCOUNTS_FORM_ACCEPTED: 'BT_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'BT_ACCOUNTS_FORM_REJECTED',
    FOLLOWUP_INITIATED: 'BT_FOLLOWUP_INITIATED',
    RETURN_VIA_BANK_TRANSFER: 'BT_RETURN_VIA_BANK_TRANSFER',
    SETTLED_WITH_PROJECT: 'BT_SETTLED_WITH_PROJECT',
} as const;

export const BT_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            BT_STATUSES.PENDING,
            BT_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            BT_STATUSES.ACCOUNTS_FORM_REJECTED,
            BT_STATUSES.FOLLOWUP_INITIATED,
            BT_STATUSES.RETURN_VIA_BANK_TRANSFER,
            BT_STATUSES.SETTLED_WITH_PROJECT,
        ],
        terminalStatuses: [BT_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4],
    },
    2: {
        name: 'Followup',
        statuses: [BT_STATUSES.FOLLOWUP_INITIATED],
        terminalStatuses: [],
        nextStages: [3, 4],
    },
    3: {
        name: 'Returned via Bank Transfer',
        statuses: [BT_STATUSES.RETURN_VIA_BANK_TRANSFER],
        terminalStatuses: [BT_STATUSES.RETURN_VIA_BANK_TRANSFER],
        nextStages: [],
    },
    4: {
        name: 'Settled with Project',
        statuses: [BT_STATUSES.SETTLED_WITH_PROJECT],
        terminalStatuses: [],
        nextStages: [],
    },
};

// ============================================================================
// PORTAL PAYMENT STATUSES - 4 Stages
// ============================================================================

export const PORTAL_STATUSES = {
    PENDING: 'PORTAL_REQUESTED',
    ACCOUNTS_FORM_ACCEPTED: 'PORTAL_ACCOUNTS_FORM_ACCEPTED',
    ACCOUNTS_FORM_REJECTED: 'PORTAL_ACCOUNTS_FORM_REJECTED',
    FOLLOWUP_INITIATED: 'PORTAL_FOLLOWUP_INITIATED',
    RETURN_VIA_BANK_TRANSFER: 'PORTAL_RETURN_VIA_BANK_TRANSFER',
    SETTLED_WITH_PROJECT: 'PORTAL_SETTLED_WITH_PROJECT',
} as const;

export const PORTAL_STAGES = {
    1: {
        name: 'Accounts Form',
        statuses: [
            PORTAL_STATUSES.PENDING,
            PORTAL_STATUSES.ACCOUNTS_FORM_ACCEPTED,
            PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED,
            PORTAL_STATUSES.FOLLOWUP_INITIATED,
            PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER,
            PORTAL_STATUSES.SETTLED_WITH_PROJECT,
        ],
        terminalStatuses: [PORTAL_STATUSES.ACCOUNTS_FORM_REJECTED],
        nextStages: [2, 3, 4],
    },
    2: {
        name: 'Followup',
        statuses: [PORTAL_STATUSES.FOLLOWUP_INITIATED],
        terminalStatuses: [],
        nextStages: [3, 4],
    },
    3: {
        name: 'Returned via Bank Transfer',
        statuses: [PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER],
        terminalStatuses: [PORTAL_STATUSES.RETURN_VIA_BANK_TRANSFER],
        nextStages: [],
    },
    4: {
        name: 'Settled with Project',
        statuses: [PORTAL_STATUSES.SETTLED_WITH_PROJECT],
        terminalStatuses: [],
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
