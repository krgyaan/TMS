export const TENDERING_WORKFLOW = {
    code: 'TENDERING_WF',
    name: 'Tendering Workflow',
    entityType: 'TENDER' as const,
    description: 'Complete workflow for tender management',

    steps: [
        // STEP 1: Tender Info (72 hours)
        {
            stepKey: 'tender_info',
            stepName: 'Tender Info',
            stepOrder: 1,
            assignedRole: 'TE',

            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 72,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: [],
            canRunInParallel: false,
            isOptional: false,

            metadata: {
                icon: '📝',
                color: '#3B82F6',
                formUrl: '/tendering/info-sheet',
                helpText: 'Complete all tender details'
            }
        },

        // STEP 2: Tender Approval (24 hours)
        {
            stepKey: 'tender_approval',
            stepName: 'Tender Approval',
            stepOrder: 2,
            assignedRole: 'TL',

            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 24,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_info'],
            canRunInParallel: false,
            isOptional: false,

            metadata: {
                icon: '✅',
                color: '#10B981'
            }
        },

        // STEP 3: RFQ Sent (24 hours)
        {
            stepKey: 'rfq_sent',
            stepName: 'RFQ Sent',
            stepOrder: 3,
            assignedRole: 'TE',

            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 24,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_approval'],
            canRunInParallel: false,
            isOptional: false,
        },

        // STEP 4: RFQ Dashboard (N/A)
        {
            stepKey: 'rfq_dashboard',
            stepName: 'RFQ Dashboard',
            stepOrder: 4,
            assignedRole: 'TE',

            timerConfig: {
                type: 'NO_TIMER' as const,
            },

            dependsOn: ['rfq_sent'],
            canRunInParallel: true,
            isOptional: true,
        },

        // STEP 5: EMD Requested (24 hours - Conditional)
        {
            stepKey: 'emd_requested',
            stepName: 'EMD Requested',
            stepOrder: 8,
            assignedRole: 'TE',

            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 24,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_approval'],
            canRunInParallel: true,
            isOptional: true,

            conditional: {
                field: 'emdRequired',
                operator: 'equals' as const,
                value: true
            },
        },

        // STEP 6: Physical Docs (48 hours)
        {
            stepKey: 'physical_docs',
            stepName: 'Physical Docs',
            stepOrder: 6,
            assignedRole: 'TE',

            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 48,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_approval'],
            canRunInParallel: true,
            isOptional: false,
        },

        // STEP 7: Document Checklist (-72h before deadline)
        {
            stepKey: 'document_checklist',
            stepName: 'Document Checklist',
            stepOrder: 7,
            assignedRole: 'TE',

            timerConfig: {
                type: 'NEGATIVE_COUNTDOWN' as const,
                hoursBeforeDeadline: -72,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_approval'],
            canRunInParallel: true,
            isOptional: false,

            metadata: {
                helpText: 'Must be completed 72 hours before tender deadline'
            }
        },

        // STEP 8: Costing Sheets (-72h before deadline)
        {
            stepKey: 'costing_sheets',
            stepName: 'Costing Sheets',
            stepOrder: 8,
            assignedRole: 'TE',

            timerConfig: {
                type: 'NEGATIVE_COUNTDOWN' as const,
                hoursBeforeDeadline: -72,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['tender_approval'],
            canRunInParallel: true,
            isOptional: false,
        },

        // STEP 9: Costing Approval (-48h before deadline)
        {
            stepKey: 'costing_approval',
            stepName: 'Costing Approval',
            stepOrder: 9,
            assignedRole: 'TL',

            timerConfig: {
                type: 'NEGATIVE_COUNTDOWN' as const,
                hoursBeforeDeadline: -48,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['costing_sheets'],
            canRunInParallel: false,
            isOptional: false,
        },

        // STEP 10: Bid Submission (-24h before deadline)
        {
            stepKey: 'bid_submission',
            stepName: 'Bid Submission',
            stepOrder: 10,
            assignedRole: 'TE',

            timerConfig: {
                type: 'NEGATIVE_COUNTDOWN' as const,
                hoursBeforeDeadline: -24,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            dependsOn: ['costing_approval'],
            canRunInParallel: false,
            isOptional: false,

            metadata: {
                helpText: 'CRITICAL: Must submit 24 hours before deadline'
            }
        },

        // STEP 11: TQ Replied (Deadline-based)
        {
            stepKey: 'tq_replied',
            stepName: 'TQ Replied',
            stepOrder: 11,
            assignedRole: 'TE',

            timerConfig: {
                type: 'DEADLINE_BASED' as const,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },

            canRunInParallel: true,
            isOptional: true,
        },

        // STEP 12: RA Approved (N/A)
        {
            stepKey: 'ra_approved',
            stepName: 'RA Approved',
            stepOrder: 12,
            assignedRole: 'TL',

            timerConfig: {
                type: 'NO_TIMER' as const,
            },

            canRunInParallel: true,
            isOptional: true,
        },

        // STEP 13: Tender Result (N/A)
        {
            stepKey: 'tender_result',
            stepName: 'Tender Result',
            stepOrder: 13,
            assignedRole: 'TE',

            timerConfig: {
                type: 'NO_TIMER' as const,
            },

            canRunInParallel: true,
            isOptional: true,
        },
    ]
};

export const COURIER_WORKFLOW = {
    code: 'COURIER_WF',
    name: 'Courier Workflow',
    entityType: 'COURIER' as const,
    description: 'Track courier from creation to delivery',

    steps: [
        {
            stepKey: 'courier_created',
            stepName: 'Courier Created',
            stepOrder: 1,
            assignedRole: 'TE',
            timerConfig: { type: 'NO_TIMER' as const },
            dependsOn: [],
            canRunInParallel: false,
            isOptional: false,
        },
        {
            stepKey: 'courier_dispatched',
            stepName: 'Courier Dispatched',
            stepOrder: 2,
            assignedRole: 'TE',
            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 2,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['courier_created'],
            canRunInParallel: false,
            isOptional: false,
        }
    ]
};

export const EMD_WORKFLOW = {
    code: 'EMD_WF',
    name: 'EMD Processing Workflow',
    entityType: 'EMD' as const,
    description: 'EMD request to payment completion',

    steps: [
        {
            stepKey: 'pop_acc_form',
            stepName: 'Pay on Portal - Accounts Form',
            stepOrder: 1,
            assignedRole: 'AC',
            timerConfig: {
                type: 'DEADLINE_BASED' as const,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'POP' },
        },
        {
            stepKey: 'bt_acc_form',
            stepName: 'Bank Transfer - Accounts Form',
            stepOrder: 2,
            assignedRole: 'AC',
            timerConfig: {
                type: 'DEADLINE_BASED' as const,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'BT' },
        },
        {
            stepKey: 'cheque_acc_form',
            stepName: 'Cheque - Accounts Form',
            stepOrder: 3,
            assignedRole: 'AC',
            timerConfig: {
                type: 'DYNAMIC' as const,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'CHEQUE' },
        },
        {
            stepKey: 'dd_acc_form',
            stepName: 'Demand Draft - Accounts Form',
            stepOrder: 4,
            assignedRole: 'AC',
            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 3,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'DD' },
        },
        {
            stepKey: 'fdr_acc_form',
            stepName: 'FDR - Accounts Form',
            stepOrder: 5,
            assignedRole: 'AC',
            timerConfig: {
                type: 'FIXED_DURATION' as const,
                durationHours: 3,
                isBusinessDaysOnly: true,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'FDR' },
        },
        {
            stepKey: 'bg_acc_form',
            stepName: 'Bank Guarantee - Accounts Form',
            stepOrder: 6,
            assignedRole: 'AC',
            timerConfig: {
                type: 'DEADLINE_BASED' as const,
                isBusinessDaysOnly: false,
                warningThreshold: 80,
                criticalThreshold: 100,
            },
            dependsOn: ['emd_requested'],
            canRunInParallel: false,
            isOptional: true,
            conditional: { field: 'emdType', operator: 'equals' as const, value: 'BG' },
        }
    ]
};

export const OPERATION_WORKFLOW = {
    code: 'OPERATION_WF',
    name: 'Operation Workflow',
    entityType: 'OPERATION' as const,
    description: 'Operation workflow for operation management',

    steps: [
        {
            stepKey: 'wo_details',
            stepName: 'WO Details',
            stepOrder: 1, assignedRole: 'TE',
            timerConfig: { type: 'NO_TIMER' as const },
            dependsOn: [], canRunInParallel: false,
            isOptional: false
        },
        {
            stepKey: 'wo_acceptance',
            stepName: 'WO Acceptance',
            stepOrder: 2, assignedRole: 'TE',
            timerConfig: { type: 'NO_TIMER' as const },
            dependsOn: ['wo_details'], canRunInParallel: false,
            isOptional: false
        },
        {
            stepKey: 'kickoff_meeting',
            stepName: 'Kickoff Meeting',
            stepOrder: 3,
            assignedRole: 'TE',
            timerConfig: { type: 'NO_TIMER' as const },
            dependsOn: ['wo_acceptance'],
            canRunInParallel: false,
            isOptional: false
        },
    ]
};

export const WORKFLOWS = {
    TENDERING_WF: TENDERING_WORKFLOW,
    COURIER_WF: COURIER_WORKFLOW,
    EMD_WF: EMD_WORKFLOW,
    OPERATION_WF: OPERATION_WORKFLOW,
};

export type WorkflowCode = keyof typeof WORKFLOWS;

// Helper to get workflow by code
export function getWorkflow(code: WorkflowCode) {
    return WORKFLOWS[code];
}

// Helper to get step definition
export function getStepDefinition(workflowCode: WorkflowCode, stepKey: string) {
    const workflow = WORKFLOWS[workflowCode];
    return workflow.steps.find(s => s.stepKey === stepKey);
}

export type TimerType = 'FIXED_DURATION' | 'DEADLINE_BASED' | 'NEGATIVE_COUNTDOWN' | 'DYNAMIC' | 'NO_TIMER';
export type OperatorType = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';

export interface TimerConfig {
    type: TimerType;
    durationHours?: number;
    hoursBeforeDeadline?: number;
    isBusinessDaysOnly?: boolean;
    warningThreshold?: number;
    criticalThreshold?: number;
}

export interface ConditionalLogic {
    field: string;
    operator: OperatorType;
    value: any;
}

export interface WorkflowStep {
    stepKey: string;
    stepName: string;
    stepOrder: number;
    assignedRole: string;
    timerConfig: TimerConfig;
    dependsOn?: string[];
    canRunInParallel?: boolean;
    isOptional?: boolean;
    conditional?: ConditionalLogic;
    metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
    code: string;
    name: string;
    entityType: 'TENDER' | 'COURIER' | 'EMD' | 'SERVICE' | 'OPERATION';
    description: string;
    steps: WorkflowStep[];
}
