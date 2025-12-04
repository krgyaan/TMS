// src/db/seeds/workflow.seed.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDb, createPool } from '../src/db/index';
import {
    wfTemplates,
    wfSteps,
    wfInstances,
    wfStepInstances,
    wfTimerEvents,
    wfBusinessCalendar,
    wfWorkingHoursConfig,
    type NewWorkflowTemplate,
    type NewWorkflowStep,
} from '../src/db/workflows.schema';

// ============================================
// TYPES
// ============================================

type StepDefinition = Omit<NewWorkflowStep, 'workflowTemplateId'>;

// ============================================
// WORKING HOURS DATA
// ============================================

const WORKING_HOURS = [
    { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isWorkingDay: false },
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', isWorkingDay: false },
] as const;

// ============================================
// HOLIDAYS DATA
// ============================================

type HolidayInput = { date: string; holidayName: string; holidayType: string };

const HOLIDAYS_2025: HolidayInput[] = [
    { date: '2025-01-26', holidayName: 'Republic Day', holidayType: 'NATIONAL' },
    { date: '2025-03-14', holidayName: 'Holi', holidayType: 'NATIONAL' },
    { date: '2025-03-31', holidayName: 'Eid ul-Fitr', holidayType: 'NATIONAL' },
    { date: '2025-04-06', holidayName: 'Ram Navami', holidayType: 'NATIONAL' },
    { date: '2025-04-10', holidayName: 'Mahavir Jayanti', holidayType: 'NATIONAL' },
    { date: '2025-04-18', holidayName: 'Good Friday', holidayType: 'NATIONAL' },
    { date: '2025-05-01', holidayName: 'May Day', holidayType: 'NATIONAL' },
    { date: '2025-06-07', holidayName: 'Eid ul-Adha', holidayType: 'NATIONAL' },
    { date: '2025-07-06', holidayName: 'Muharram', holidayType: 'NATIONAL' },
    { date: '2025-08-15', holidayName: 'Independence Day', holidayType: 'NATIONAL' },
    { date: '2025-08-16', holidayName: 'Janmashtami', holidayType: 'NATIONAL' },
    { date: '2025-10-02', holidayName: 'Gandhi Jayanti', holidayType: 'NATIONAL' },
    { date: '2025-10-20', holidayName: 'Diwali', holidayType: 'NATIONAL' },
    { date: '2025-11-05', holidayName: 'Guru Nanak Jayanti', holidayType: 'NATIONAL' },
    { date: '2025-12-25', holidayName: 'Christmas', holidayType: 'NATIONAL' },
];

const HOLIDAYS_2026: HolidayInput[] = [
    { date: '2026-01-26', holidayName: 'Republic Day', holidayType: 'NATIONAL' },
    { date: '2026-03-04', holidayName: 'Holi', holidayType: 'NATIONAL' },
    { date: '2026-03-21', holidayName: 'Id-ul-Fitr', holidayType: 'NATIONAL' },
    { date: '2026-03-26', holidayName: 'Ram Navami', holidayType: 'NATIONAL' },
    { date: '2026-03-31', holidayName: 'Mahavir Jayanti', holidayType: 'NATIONAL' },
    { date: '2026-04-03', holidayName: 'Good Friday', holidayType: 'NATIONAL' },
    { date: '2026-05-01', holidayName: 'Buddha Purnima', holidayType: 'NATIONAL' },
    { date: '2026-05-27', holidayName: 'Eid ul-Adha (Bakrid)', holidayType: 'NATIONAL' },
    { date: '2026-06-26', holidayName: 'Muharram', holidayType: 'NATIONAL' },
    { date: '2026-08-15', holidayName: 'Independence Day', holidayType: 'NATIONAL' },
    { date: '2026-08-26', holidayName: 'Milad-un-Nabi', holidayType: 'NATIONAL' },
    { date: '2026-09-04', holidayName: 'Janmashtami', holidayType: 'NATIONAL' },
    { date: '2026-10-02', holidayName: 'Gandhi Jayanti', holidayType: 'NATIONAL' },
    { date: '2026-10-20', holidayName: 'Dussehra', holidayType: 'NATIONAL' },
    { date: '2026-11-08', holidayName: 'Diwali', holidayType: 'NATIONAL' },
    { date: '2026-11-24', holidayName: 'Guru Nanak Jayanti', holidayType: 'NATIONAL' },
    { date: '2026-12-25', holidayName: 'Christmas', holidayType: 'NATIONAL' },
];

// ============================================
// WORKFLOW TEMPLATES
// ============================================

const WORKFLOW_TEMPLATES: (NewWorkflowTemplate & { id: number })[] = [
    {
        id: 1,
        name: 'Tendering Workflow',
        code: 'TENDERING_WF',
        description: 'Complete workflow for tender management from creation to result',
        entityType: 'TENDER',
        isActive: true,
        version: 1,
        metadata: { icon: '📋', color: '#3B82F6', category: 'Tendering' },
    },
    {
        id: 2,
        name: 'Courier Workflow',
        code: 'COURIER_WF',
        description: 'Track courier dispatch until pickup',
        entityType: 'COURIER',
        isActive: true,
        version: 1,
        metadata: { icon: '📦', color: '#F59E0B', category: 'Shared' },
    },
    {
        id: 3,
        name: 'Operation Workflow',
        code: 'OPERATION_WF',
        description: 'Work Order processing from WO receipt to Kickoff Meeting',
        entityType: 'OPERATION_CONTRACT',
        isActive: true,
        version: 1,
        metadata: { icon: '🏗️', color: '#10B981', category: 'Operations' },
    },
];

// ============================================
// TENDERING WORKFLOW STEPS (Template ID: 1)
// ============================================

const TENDERING_STEPS: StepDefinition[] = [
    // ============================================
    // STEP 1: Tender Info Sheet (72 hrs) - STARTS IMMEDIATELY
    // ============================================
    {
        stepKey: 'tender_info_sheet',
        stepName: 'Tender Info Sheet',
        stepOrder: 1,
        description: 'Fill complete tender information sheet',
        assignedRole: 'TE',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 72,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        startTrigger: { type: 'IMMEDIATE' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'tender_info_sheet_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '📝',
            color: '#3B82F6',
            formUrl: '/tendering/info-sheet',
            helpText: 'Complete all tender details including organization, dates, and requirements',
        },
    },

    // ============================================
    // STEP 2: Tender Approval (24 hrs) - AFTER tender_info_sheet
    // ============================================
    {
        stepKey: 'tender_approval',
        stepName: 'Tender Approval',
        stepOrder: 2,
        description: 'Team Leader reviews and approves tender participation',
        assignedRole: 'TL',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 24,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['tender_info_sheet'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_info_sheet' },
        endTrigger: { type: 'APPROVAL' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '✅',
            color: '#10B981',
            formUrl: '/tendering/approval',
            helpText: 'Review tender details and decide whether to participate',
        },
    },

    // ============================================
    // STEP 3: RFQ (24 hrs) - CONDITIONAL, PARALLEL
    // Condition: if rfq_to is not empty or > 0
    // ============================================
    {
        stepKey: 'rfq',
        stepName: 'RFQ',
        stepOrder: 3,
        description: 'Create and send RFQ to vendors',
        assignedRole: 'TE',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 24,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tender_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'rfq_form' },
        conditionalLogic: {
            field: 'rfq_to',
            operator: 'notEquals',
            value: null,
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '📨',
            color: '#3B82F6',
            formUrl: '/tendering/rfqs',
            helpText: 'Only if RFQ vendors are specified',
        },
    },

    // ============================================
    // STEP 4: RFQ Response (till due_date) - AFTER rfq
    // Timer runs until tender due_date
    // ============================================
    {
        stepKey: 'rfq_response',
        stepName: 'RFQ Response',
        stepOrder: 4,
        description: 'Collect and track RFQ responses from vendors',
        assignedRole: 'TE',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['rfq'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'rfq' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'rfq_response_form' },
        isOptional: true,
        allowSkip: true,
        metadata: {
            icon: '📥',
            color: '#10B981',
            formUrl: '/tendering/rfqs/responses',
            helpText: 'Track vendor responses until tender due date',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 5: Physical Docs (48 hrs) - CONDITIONAL, PARALLEL
    // Condition: if physical_docs_required == 'Yes'
    // ============================================
    {
        stepKey: 'physical_docs',
        stepName: 'Physical Docs',
        stepOrder: 5,
        description: 'Prepare and dispatch physical tender documents',
        assignedRole: 'TE',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 48,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tender_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'physical_docs_form' },
        conditionalLogic: {
            field: 'physical_docs_required',
            operator: 'equals',
            value: 'Yes',
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '📦',
            color: '#F59E0B',
            formUrl: '/tendering/phydocs',
            helpText: 'Only if physical documents are required',
        },
    },

    // ============================================
    // STEP 6: EMD Request (24 hrs) - CONDITIONAL, PARALLEL
    // ============================================
    {
        stepKey: 'emd_request',
        stepName: 'EMD/Fees Request',
        stepOrder: 6,
        description: 'Request EMD, Tender Fees, or Processing Fees from accounts',
        assignedRole: 'TE',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 24,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tender_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'emd_request_form' },
        conditionalLogic: {
            field: 'has_any_fee_required',
            operator: 'equals',
            value: true,
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '💳',
            color: '#DC2626',
            formUrl: '/tendering/emds-tenderfees',
            helpText: 'Required if EMD, Tender Fees, or Processing Fees are applicable',
            conditions: [
                { field: 'emd_required', operator: 'equals', value: 'Yes', andField: 'emd', andOperator: 'greaterThan', andValue: 0 },
                { field: 'tender_fees_required', operator: 'equals', value: 'Yes', andField: 'tender_fees', andOperator: 'greaterThan', andValue: 0 },
                { field: 'processing_fees_required', operator: 'equals', value: 'Yes', andField: 'processing_fees', andOperator: 'greaterThan', andValue: 0 },
            ],
        },
    },

    // ============================================
    // STEP 7: Document Checklist (-72h before due_date) - PARALLEL
    // ============================================
    {
        stepKey: 'document_checklist',
        stepName: 'Document Checklist',
        stepOrder: 7,
        description: 'Complete and submit document checklist',
        assignedRole: 'TE',
        timerType: 'NEGATIVE_COUNTDOWN',
        hoursBeforeDeadline: 72,
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tender_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'checklist_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '✔️',
            color: '#EF4444',
            formUrl: '/tendering/checklists',
            helpText: 'Must be completed 72 hours before tender submission deadline',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 8: Costing Sheet (-72h before due_date) - PARALLEL
    // ============================================
    {
        stepKey: 'costing_sheet',
        stepName: 'Costing Sheet',
        stepOrder: 8,
        description: 'Prepare detailed costing/pricing sheets',
        assignedRole: 'TE',
        timerType: 'NEGATIVE_COUNTDOWN',
        hoursBeforeDeadline: 72,
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tender_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tender_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'costing_sheet_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '📊',
            color: '#EF4444',
            formUrl: '/tendering/costing-sheets',
            helpText: 'Must be completed 72 hours before tender submission deadline',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 9: EMD Payment (till due_date) - AFTER emd_request
    // ============================================
    {
        stepKey: 'emd_payment',
        stepName: 'EMD Payment',
        stepOrder: 9,
        description: 'Process EMD payment',
        assignedRole: 'AC',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['emd_request'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'emd_request' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'emd_payment_form' },
        conditionalLogic: {
            field: 'emd_required',
            operator: 'equals',
            value: 'Yes',
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '💰',
            color: '#059669',
            formUrl: '/bi-dashboard/emd-payment',
            helpText: 'Must be completed before tender due date',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 10: Tender Fees Payment (till due_date) - AFTER emd_request
    // ============================================
    {
        stepKey: 'tender_fees_payment',
        stepName: 'Tender Fees Payment',
        stepOrder: 10,
        description: 'Process tender fees payment',
        assignedRole: 'AC',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['emd_request'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'emd_request' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'tender_fees_payment_form' },
        conditionalLogic: {
            field: 'tender_fees_required',
            operator: 'equals',
            value: 'Yes',
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '💵',
            color: '#F59E0B',
            formUrl: '/bi-dashboard/tender-fees-payment',
            helpText: 'Must be completed before tender due date',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 11: Processing Fees Payment (till due_date) - AFTER emd_request
    // ============================================
    {
        stepKey: 'processing_fees_payment',
        stepName: 'Processing Fees Payment',
        stepOrder: 11,
        description: 'Process processing fees payment',
        assignedRole: 'AC',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['emd_request'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'emd_request' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'processing_fees_payment_form' },
        conditionalLogic: {
            field: 'processing_fees_required',
            operator: 'equals',
            value: 'Yes',
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '💳',
            color: '#7C3AED',
            formUrl: '/bi-dashboard/processing-fees-payment',
            helpText: 'Must be completed before tender due date',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 12: Costing Approval (-48h before due_date) - AFTER costing_sheet
    // ============================================
    {
        stepKey: 'costing_approval',
        stepName: 'Costing Approval',
        stepOrder: 12,
        description: 'Team Leader approves final pricing',
        assignedRole: 'TL',
        timerType: 'NEGATIVE_COUNTDOWN',
        hoursBeforeDeadline: 48,
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['costing_sheet'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'costing_sheet' },
        endTrigger: { type: 'APPROVAL' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '✅',
            color: '#DC2626',
            formUrl: '/tendering/costing-sheets/approval',
            helpText: 'Must be approved 48 hours before tender submission deadline',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 13: Bid Submission (-24h before due_date) - AFTER costing_approval
    // ============================================
    {
        stepKey: 'bid_submission',
        stepName: 'Bid Submission',
        stepOrder: 13,
        description: 'Final bid submission on portal',
        assignedRole: 'TE',
        timerType: 'NEGATIVE_COUNTDOWN',
        hoursBeforeDeadline: 24,
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['costing_approval'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'costing_approval' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'bid_submission_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '🚀',
            color: '#B91C1C',
            formUrl: '/tendering/bid-submissions',
            helpText: 'CRITICAL: Must submit 24 hours before tender deadline',
            deadlineField: 'due_date',
        },
    },

    // ============================================
    // STEP 14: TQ Submission (NO TIMER - Manual Start)
    // ============================================
    {
        stepKey: 'tq_submission',
        stepName: 'TQ Submission',
        stepOrder: 14,
        description: 'Submit Technical Queries',
        assignedRole: 'TE',
        timerType: 'NO_TIMER',
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        startTrigger: { type: 'MANUAL' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'tq_submission_form' },
        isOptional: true,
        allowSkip: true,
        metadata: {
            icon: '❓',
            color: '#8B5CF6',
            formUrl: '/tendering/tqs',
            helpText: 'Submit technical queries when received from client',
        },
    },

    // ============================================
    // STEP 15: TQ Completion (till tq_deadline) - AFTER tq_submission
    // ============================================
    {
        stepKey: 'tq_completion',
        stepName: 'TQ Completion',
        stepOrder: 15,
        description: 'Complete Technical Query response',
        assignedRole: 'TE',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        dependsOnSteps: ['tq_submission'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'tq_submission' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'tq_completion_form' },
        isOptional: true,
        allowSkip: true,
        metadata: {
            icon: '📝',
            color: '#3B82F6',
            formUrl: '/tendering/tqs/complete',
            helpText: 'Complete TQ response before TQ deadline',
            deadlineField: 'tq_deadline',
        },
    },

    // ============================================
    // STEP 16: RA Submission (NO TIMER)
    // ============================================
    {
        stepKey: 'ra_submission',
        stepName: 'RA Submission',
        stepOrder: 16,
        description: 'Reverse Auction submission',
        assignedRole: 'TL',
        timerType: 'NO_TIMER',
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        startTrigger: { type: 'MANUAL' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'ra_submission_form' },
        isOptional: true,
        allowSkip: true,
        metadata: {
            icon: '🔨',
            color: '#8B5CF6',
            formUrl: '/tendering/ras',
        },
    },

    // ============================================
    // STEP 17: Result Declaration (NO TIMER)
    // ============================================
    {
        stepKey: 'result',
        stepName: 'Result Declaration',
        stepOrder: 17,
        description: 'Final tender result (Won/Lost)',
        assignedRole: 'TE',
        timerType: 'NO_TIMER',
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: true,
        startTrigger: { type: 'MANUAL' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'result_form' },
        isOptional: true,
        allowSkip: true,
        metadata: {
            icon: '🏆',
            color: '#059669',
            formUrl: '/tendering/results',
        },
    },
];

// ============================================
// COURIER WORKFLOW STEPS (Template ID: 2)
// ============================================

const COURIER_STEPS: StepDefinition[] = [
    {
        stepKey: 'courier_dispatch',
        stepName: 'Courier Dispatch',
        stepOrder: 1,
        description: 'Dispatch courier - timer runs until pickup date is filled',
        assignedRole: 'TE',
        timerType: 'DEADLINE_BASED',
        isBusinessDaysOnly: false,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        startTrigger: { type: 'IMMEDIATE' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'courier_pickup_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '📦',
            color: '#F59E0B',
            formUrl: '/shared/courier',
            helpText: 'Timer runs until pickup_date is filled',
            deadlineField: 'pickup_date',
            completionField: 'pickup_date',
        },
    },
];

// ============================================
// OPERATION WORKFLOW STEPS (Template ID: 3)
// ============================================

const OPERATION_STEPS: StepDefinition[] = [
    // ============================================
    // STEP 1: WO Details (72 hrs) - STARTS ON WO RECEIPT
    // ============================================
    {
        stepKey: 'wo_details',
        stepName: 'WO Details',
        stepOrder: 1,
        description: 'Fill Work Order details form',
        assignedRole: 'TE',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 72,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        startTrigger: { type: 'IMMEDIATE' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'wo_details_form' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '📋',
            color: '#3B82F6',
            formUrl: '/operations/wo-details',
            helpText: 'Complete Work Order details within 72 hours of WO receipt',
            stopsTimerFor: null, // First step, no previous timer to stop
        },
    },

    // ============================================
    // STEP 2: WO Acceptance (24 hrs) - AFTER wo_details
    // Completing this step STOPS wo_details timer
    // ============================================
    {
        stepKey: 'wo_acceptance',
        stepName: 'WO Acceptance',
        stepOrder: 2,
        description: 'Team Leader reviews and accepts Work Order',
        assignedRole: 'TL',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 24,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['wo_details'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'wo_details' },
        endTrigger: { type: 'APPROVAL' },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '✅',
            color: '#10B981',
            formUrl: '/operations/wo-acceptance',
            helpText: 'TL must accept WO within 24 hours. Completing this stops wo_details timer.',
            stopsTimerFor: 'wo_details', // This step completion stops wo_details timer
            decisionField: 'wo_amendment_needed', // Field that determines next step
            decisionOptions: {
                'NO': 'kickoff_meeting', // If NO amendment, proceed to kickoff
                'YES': null, // If YES, workflow pauses (amendment needed)
            },
        },
    },

    // ============================================
    // STEP 3: Kickoff Meeting (72 hrs) - CONDITIONAL AFTER wo_acceptance
    // Condition: wo_amendment_needed = 'NO'
    // ============================================
    {
        stepKey: 'kickoff_meeting',
        stepName: 'Kickoff Meeting',
        stepOrder: 3,
        description: 'Initiate and conduct Kickoff Meeting with team',
        assignedRole: 'TL',
        timerType: 'FIXED_DURATION',
        defaultDurationHours: 72,
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['wo_acceptance'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'wo_acceptance' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'kickoff_meeting_form' },
        conditionalLogic: {
            field: 'wo_amendment_needed',
            operator: 'equals',
            value: 'NO',
        },
        isOptional: false,
        allowSkip: false,
        metadata: {
            icon: '🚀',
            color: '#8B5CF6',
            formUrl: '/operations/kickoff-meeting',
            helpText: 'Only initiated if WO Amendment is NOT needed. Complete within 72 hours.',
            requiresCondition: 'wo_amendment_needed = NO',
        },
    },

    // ============================================
    // STEP 4: WO Amendment (NO TIMER) - CONDITIONAL
    // Only if wo_amendment_needed = 'YES'
    // ============================================
    {
        stepKey: 'wo_amendment',
        stepName: 'WO Amendment',
        stepOrder: 4,
        description: 'Handle Work Order amendment if required',
        assignedRole: 'TE',
        timerType: 'NO_TIMER',
        isBusinessDaysOnly: true,
        warningThreshold: 80,
        criticalThreshold: 100,
        canRunInParallel: false,
        dependsOnSteps: ['wo_acceptance'],
        startTrigger: { type: 'STEP_COMPLETED', stepKey: 'wo_acceptance' },
        endTrigger: { type: 'FORM_SUBMITTED', formKey: 'wo_amendment_form' },
        conditionalLogic: {
            field: 'wo_amendment_needed',
            operator: 'equals',
            value: 'YES',
        },
        isOptional: true,
        allowSkip: false,
        metadata: {
            icon: '📝',
            color: '#F59E0B',
            formUrl: '/operations/wo-amendment',
            helpText: 'Only if WO Amendment is needed. After amendment, workflow may restart from wo_details.',
            requiresCondition: 'wo_amendment_needed = YES',
            nextStepAfterAmendment: 'wo_details', // Restart from wo_details after amendment
        },
    },
];

// ============================================
// STEPS MAPPING BY TEMPLATE ID
// ============================================

const STEPS_BY_TEMPLATE: Record<number, StepDefinition[]> = {
    1: TENDERING_STEPS,
    2: COURIER_STEPS,
    3: OPERATION_STEPS,
};

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');

    const pool = createPool(url);
    const db = createDb(pool);

    console.log('🌱 Starting workflow seed...\n');

    // ============================================
    // TRUNCATE TABLES
    // ============================================

    console.log('🔄 Truncating workflow tables...');
    await db.execute(sql`TRUNCATE TABLE ${wfTimerEvents} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfStepInstances} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfInstances} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfSteps} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfTemplates} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfBusinessCalendar} RESTART IDENTITY CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ${wfWorkingHoursConfig} RESTART IDENTITY CASCADE`);
    console.log('✅ Tables truncated\n');

    // ============================================
    // SEED WORKING HOURS
    // ============================================

    console.log('⏰ Seeding working hours...');
    const workingHoursData = WORKING_HOURS.map((h, idx) => ({
        id: idx + 1,
        ...h,
        teamId: null,
    }));
    await db.insert(wfWorkingHoursConfig).values(workingHoursData);
    console.log(`   ✅ Created ${workingHoursData.length} working hour configs\n`);

    // ============================================
    // SEED HOLIDAYS
    // ============================================

    console.log('📅 Seeding business calendar...');
    const allHolidays = [...HOLIDAYS_2025, ...HOLIDAYS_2026].map((h, idx) => ({
        id: idx + 1,
        date: new Date(h.date),
        holidayName: h.holidayName,
        holidayType: h.holidayType,
        isHoliday: true,
        isWeekend: false,
        locationId: null,
    }));
    await db.insert(wfBusinessCalendar).values(allHolidays);
    console.log(`   ✅ Created ${allHolidays.length} holiday entries\n`);

    // ============================================
    // SEED WORKFLOW TEMPLATES
    // ============================================

    console.log('📋 Seeding workflow templates...');
    await db.insert(wfTemplates).values(WORKFLOW_TEMPLATES);
    console.log(`   ✅ Created ${WORKFLOW_TEMPLATES.length} workflow templates\n`);

    // ============================================
    // SEED WORKFLOW STEPS
    // ============================================

    console.log('📝 Seeding workflow steps...\n');
    let stepId = 1;
    let totalSteps = 0;

    for (const template of WORKFLOW_TEMPLATES) {
        const steps = STEPS_BY_TEMPLATE[template.id];
        if (!steps) continue;

        const stepsWithIds = steps.map((step) => ({
            id: stepId++,
            workflowTemplateId: template.id,
            ...step,
        }));

        await db.insert(wfSteps).values(stepsWithIds);
        totalSteps += stepsWithIds.length;
        console.log(`   📌 ${template.name} (${template.code})`);
        console.log(`      Steps: ${stepsWithIds.length}`);

        // Print step summary
        for (const step of stepsWithIds) {
            const timerInfo = step.timerType === 'FIXED_DURATION'
                ? `${step.defaultDurationHours}h`
                : step.timerType === 'NEGATIVE_COUNTDOWN'
                    ? `-${step.hoursBeforeDeadline}h before deadline`
                    : step.timerType === 'DEADLINE_BASED'
                        ? 'till deadline'
                        : 'no timer';
            const conditional = step.conditionalLogic ? ' (conditional)' : '';
            console.log(`         ${step.stepOrder}. ${step.stepName} [${timerInfo}]${conditional}`);
        }
        console.log('');
    }

    console.log(`   ✅ Created ${totalSteps} total workflow steps\n`);

    // ============================================
    // CLEANUP
    // ============================================

    await pool.end();

    // ============================================
    // FINAL SUMMARY
    // ============================================

    console.log('═'.repeat(70));
    console.log('🎉 Workflow seed completed successfully!');
    console.log('═'.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   • Working Hours: ${workingHoursData.length} configs`);
    console.log(`   • Holidays: ${allHolidays.length} entries`);
    console.log(`   • Workflow Templates: ${WORKFLOW_TEMPLATES.length}`);
    console.log(`   • Workflow Steps: ${totalSteps}`);

    console.log('\n📋 Workflows Overview:\n');

    // Tendering Workflow
    console.log('   1️⃣  TENDERING WORKFLOW (TENDERING_WF)');
    console.log('       Entity: TENDER');
    console.log('       Flow:');
    console.log('       ├── tender_info_sheet (72h) → IMMEDIATE');
    console.log('       ├── tender_approval (24h) → after tender_info_sheet');
    console.log('       ├── [PARALLEL after approval]');
    console.log('       │   ├── rfq (24h) → if rfq_to set');
    console.log('       │   │   └── rfq_response (till due_date)');
    console.log('       │   ├── physical_docs (48h) → if required');
    console.log('       │   ├── emd_request (24h) → if any fees');
    console.log('       │   │   └── [PARALLEL] emd/tender_fees/processing_fees (till due_date)');
    console.log('       │   ├── document_checklist (-72h before due)');
    console.log('       │   └── costing_sheet (-72h before due)');
    console.log('       │       └── costing_approval (-48h before due)');
    console.log('       │           └── bid_submission (-24h before due)');
    console.log('       ├── [MANUAL] tq_submission → tq_completion (till tq_deadline)');
    console.log('       ├── [MANUAL] ra_submission (no timer)');
    console.log('       └── [MANUAL] result (no timer)');

    console.log('\n   2️⃣  COURIER WORKFLOW (COURIER_WF)');
    console.log('       Entity: COURIER');
    console.log('       Flow:');
    console.log('       └── courier_dispatch (till pickup_date) → IMMEDIATE');

    console.log('\n   3️⃣  OPERATION WORKFLOW (OPERATION_WF)');
    console.log('       Entity: OPERATION_CONTRACT');
    console.log('       Flow:');
    console.log('       ├── wo_details (72h) → IMMEDIATE (on WO receipt)');
    console.log('       ├── wo_acceptance (24h) → after wo_details');
    console.log('       │   [DECISION: wo_amendment_needed]');
    console.log('       │   ├── IF "NO" → kickoff_meeting (72h)');
    console.log('       │   └── IF "YES" → wo_amendment (no timer) → restart from wo_details');
    console.log('');
}

main().catch((err) => {
    console.error('❌ Workflow seed failed:', err);
    process.exit(1);
});
