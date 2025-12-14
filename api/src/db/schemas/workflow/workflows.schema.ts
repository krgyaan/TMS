import {
    pgTable,
    varchar,
    text,
    integer,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
    bigint
} from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { teams } from '@db/schemas/master/teams.schema';
import { users } from '@db/schemas/auth/users.schema';

// ============================================
// ENUMS
// ============================================

export const timerTypeEnum = pgEnum('timer_type', [
    'FIXED_DURATION',      // 72h, 24h, 48h
    'DEADLINE_BASED',      // Countdown to specific date
    'NEGATIVE_COUNTDOWN',  // -72h, -48h, -24h before deadline
    'DYNAMIC',             // User-defined duration
    'NO_TIMER'             // N/A
]);

export const timerStatusEnum = pgEnum('timer_status', [
    'NOT_STARTED',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'OVERDUE',
    'SKIPPED',
    'CANCELLED'
]);

export const workflowStepStatusEnum = pgEnum('workflow_step_status', [
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED',
    'REJECTED',
    'ON_HOLD'
]);

export const entityTypeEnum = pgEnum('entity_type', [
    'TENDER',
    'COURIER',
    'EMD',
    'SERVICE_AMC',
    'SERVICE_VISIT',
    'CRM_LEAD',
    'CRM_QUOTATION',
    'OPERATION_KICKOFF',
    'OPERATION_CONTRACT'
]);

// ============================================
// MASTER TABLES (Workflow Templates)
// ============================================

/**
 * WORKFLOW TEMPLATES
 * Defines reusable workflow blueprints
 * Examples: Tendering Workflow, Courier Workflow, EMD Workflow
 */
export const wfTemplates = pgTable('wf_templates', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    description: text('description'),
    teamId: bigint('team_id', { mode: 'number' }),
    entityType: entityTypeEnum('entity_type').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    version: integer('version').default(1).notNull(),
    metadata: jsonb('metadata').$type<{
        icon?: string;
        color?: string;
        category?: string;
        [key: string]: any;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdBy: bigint('created_by', { mode: 'number' }),
}, (table) => ([
    { name: 'codeIdx', columns: [table.code] },
    { name: 'entityTypeIdx', columns: [table.entityType] },
]));

/**
 * WORKFLOW STEPS
 * Individual steps within a workflow template
 */
export const wfSteps = pgTable('wf_steps', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    workflowTemplateId: bigint('workflow_template_id', { mode: 'number' }).notNull(),

    // Step Identification
    stepKey: varchar('step_key', { length: 100 }).notNull(),
    stepName: varchar('step_name', { length: 255 }).notNull(),
    stepOrder: integer('step_order').notNull(),
    description: text('description'),

    // Assignment
    assignedRole: varchar('assigned_role', { length: 50 }).notNull(),

    // Timer Configuration
    timerType: timerTypeEnum('timer_type').notNull(),
    defaultDurationHours: integer('default_duration_hours'),
    isBusinessDaysOnly: boolean('is_business_days_only').default(true).notNull(),

    // Thresholds (percentage)
    warningThreshold: integer('warning_threshold').default(80).notNull(),
    criticalThreshold: integer('critical_threshold').default(100).notNull(),

    // Negative Countdown
    hoursBeforeDeadline: integer('hours_before_deadline'),

    // Dependencies & Flow Control
    dependsOnSteps: jsonb('depends_on_steps').$type<string[]>(),
    canRunInParallel: boolean('can_run_in_parallel').default(false).notNull(),

    // Triggers
    startTrigger: jsonb('start_trigger').$type<{
        type: 'IMMEDIATE' | 'STEP_COMPLETED' | 'FORM_SUBMITTED' | 'MANUAL' | 'DATE_BASED';
        stepKey?: string;
        formKey?: string;
        dateField?: string;
    }>(),

    endTrigger: jsonb('end_trigger').$type<{
        type: 'FORM_SUBMITTED' | 'APPROVAL' | 'MANUAL' | 'AUTO';
        formKey?: string;
    }>(),

    // Optional/Conditional
    isOptional: boolean('is_optional').default(false).notNull(),
    allowSkip: boolean('allow_skip').default(false).notNull(),
    conditionalLogic: jsonb('conditional_logic').$type<{
        field?: string;
        operator?: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains';
        value?: any;
    }>(),

    // Metadata
    metadata: jsonb('metadata').$type<{
        icon?: string;
        color?: string;
        formUrl?: string;
        helpText?: string;
        [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'workflowTemplateIdx', columns: [table.workflowTemplateId] },
    { name: 'stepKeyIdx', columns: [table.stepKey] },
    { name: 'stepOrderIdx', columns: [table.stepOrder] },
]));

// ============================================
// INSTANCE TABLES (Actual Workflow Executions)
// ============================================

/**
 * WORKFLOW INSTANCES
 * Each entity (tender/courier/emd) gets its own workflow instance
 */
export const wfInstances = pgTable('wf_instances', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    workflowTemplateId: bigint('workflow_template_id', { mode: 'number' }).notNull(),

    // Polymorphic relationship
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),

    // Status
    status: workflowStepStatusEnum('status').default('PENDING').notNull(),

    // Lifecycle
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),

    // Progress tracking
    totalSteps: integer('total_steps').default(0).notNull(),
    completedSteps: integer('completed_steps').default(0).notNull(),

    // Metadata
    metadata: jsonb('metadata').$type<{
        submissionDeadline?: string;
        expectedDeliveryDate?: string;
        requiredByDate?: string;
        priority?: string;
        tags?: string[];
        [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'entityIdx', columns: [table.entityType, table.entityId] },
    { name: 'statusIdx', columns: [table.status] },
    { name: 'createdAtIdx', columns: [table.createdAt] },
]));

/**
 * STEP INSTANCES
 * Actual execution of each step
 * THIS IS WHERE THE MAGIC HAPPENS!
 */
export const wfStepInstances = pgTable('wf_step_instances', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    workflowInstanceId: bigint('workflow_instance_id', { mode: 'number' }).notNull(),
    workflowStepId: bigint('workflow_step_id', { mode: 'number' }).notNull(),

    // Status
    status: workflowStepStatusEnum('status').default('PENDING').notNull(),
    timerStatus: timerStatusEnum('timer_status').default('NOT_STARTED').notNull(),

    // Assignment
    assignedToUserId: bigint('assigned_to_user_id', { mode: 'number' }),

    // Time Tracking
    scheduledStartAt: timestamp('scheduled_start_at'),
    actualStartAt: timestamp('actual_start_at'),
    scheduledEndAt: timestamp('scheduled_end_at'),
    actualEndAt: timestamp('actual_end_at'),

    // Custom Durations
    customDurationHours: integer('custom_duration_hours'),
    customDeadline: timestamp('custom_deadline'),

    // Pause/Extension Tracking
    totalPausedDurationMs: integer('total_paused_duration_ms').default(0).notNull(),
    extensionDurationMs: integer('extension_duration_ms').default(0).notNull(),

    // Rejection/Rework
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),
    rejectionCount: integer('rejection_count').default(0).notNull(),
    shouldResetOnRejection: boolean('should_reset_on_rejection').default(false).notNull(),

    // Performance Metrics (calculated on completion)
    allocatedTimeMs: integer('allocated_time_ms'),
    actualTimeMs: integer('actual_time_ms'),
    remainingTimeMs: integer('remaining_time_ms'),

    // Metadata
    metadata: jsonb('metadata').$type<{
        migratedFromLaravel?: boolean;
        originalTimerId?: number;
        laravelStage?: string;
        laravelRemainingTime?: number;
        notes?: string;
        [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'workflowInstanceIdx', columns: [table.workflowInstanceId] },
    { name: 'statusIdx', columns: [table.status] },
    { name: 'timerStatusIdx', columns: [table.timerStatus] },
    { name: 'assignedUserIdx', columns: [table.assignedToUserId] },
    { name: 'actualStartIdx', columns: [table.actualStartAt] },
]));

/**
 * TIMER EVENTS
 * Complete audit trail of every timer action
 */
export const wfTimerEvents = pgTable('wf_timer_events', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    stepInstanceId: bigint('step_instance_id', { mode: 'number' }).notNull(),

    // Event Details
    eventType: varchar('event_type', { length: 50 }).notNull(),
    // Values: START, PAUSE, RESUME, COMPLETE, EXTEND, RESET, SKIP, CANCEL, REJECT, APPROVE

    performedByUserId: bigint('performed_by_user_id', { mode: 'number' }),

    // State Changes
    previousStatus: timerStatusEnum('previous_status'),
    newStatus: timerStatusEnum('new_status'),

    // Additional Data
    durationChangeMs: integer('duration_change_ms'),
    reason: text('reason'),

    // Metadata
    metadata: jsonb('metadata').$type<{
        ipAddress?: string;
        userAgent?: string;
        remainingTimeSeconds?: number;
        completedEarly?: boolean;
        [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'stepInstanceIdx', columns: [table.stepInstanceId] },
    { name: 'eventTypeIdx', columns: [table.eventType] },
    { name: 'performedByIdx', columns: [table.performedByUserId] },
    { name: 'createdAtIdx', columns: [table.createdAt] },
]));

// ============================================
// BUSINESS CALENDAR
// ============================================

/**
 * BUSINESS CALENDAR
 * Holidays and non-working days
 */
export const wfBusinessCalendar = pgTable('wf_business_calendar', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    date: timestamp('date', { mode: 'date' }).notNull(),
    isHoliday: boolean('is_holiday').default(false).notNull(),
    isWeekend: boolean('is_weekend').default(false).notNull(),
    holidayName: varchar('holiday_name', { length: 255 }),
    holidayType: varchar('holiday_type', { length: 50 }), // 'NATIONAL', 'REGIONAL', 'COMPANY'
    locationId: bigint('location_id', { mode: 'number' }), // For location-specific holidays
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'dateIdx', columns: [table.date] },
    { name: 'isHolidayIdx', columns: [table.isHoliday] },
]));

/**
 * WORKING HOURS CONFIG
 * Define working hours per day
 */
export const wfWorkingHoursConfig = pgTable('wf_working_hours_config', {
    id: bigint('id', { mode: 'number' }).primaryKey(),
    teamId: bigint('team_id', { mode: 'number' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0-6
    startTime: varchar('start_time', { length: 5 }).notNull(), // "09:00"
    endTime: varchar('end_time', { length: 5 }).notNull(), // "18:00"
    isWorkingDay: boolean('is_working_day').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
    { name: 'teamDayIdx', columns: [table.teamId, table.dayOfWeek] },
]));

// ============================================
// RELATIONS
// ============================================

export const wfTemplatesRelations = relations(wfTemplates, ({ one, many }) => ({
    team: one(teams, {
        fields: [wfTemplates.teamId],
        references: [teams.id]
    }),
    createdByUser: one(users, {
        fields: [wfTemplates.createdBy],
        references: [users.id]
    }),
    steps: many(wfSteps),
    instances: many(wfInstances)
}));

export const wfStepsRelations = relations(wfSteps, ({ one, many }) => ({
    template: one(wfTemplates, {
        fields: [wfSteps.workflowTemplateId],
        references: [wfTemplates.id]
    }),
    instances: many(wfStepInstances)
}));

export const wfInstancesRelations = relations(wfInstances, ({ one, many }) => ({
    template: one(wfTemplates, {
        fields: [wfInstances.workflowTemplateId],
        references: [wfTemplates.id]
    }),
    steps: many(wfStepInstances)
}));

export const wfStepInstancesRelations = relations(wfStepInstances, ({ one, many }) => ({
    workflowInstance: one(wfInstances, {
        fields: [wfStepInstances.workflowInstanceId],
        references: [wfInstances.id]
    }),
    workflowStep: one(wfSteps, {
        fields: [wfStepInstances.workflowStepId],
        references: [wfSteps.id]
    }),
    assignedTo: one(users, {
        fields: [wfStepInstances.assignedToUserId],
        references: [users.id]
    }),
    events: many(wfTimerEvents)
}));

export const wfTimerEventsRelations = relations(wfTimerEvents, ({ one }) => ({
    stepInstance: one(wfStepInstances, {
        fields: [wfTimerEvents.stepInstanceId],
        references: [wfStepInstances.id]
    }),
    performedBy: one(users, {
        fields: [wfTimerEvents.performedByUserId],
        references: [users.id]
    })
}));

export const wfWorkingHoursConfigRelations = relations(wfWorkingHoursConfig, ({ one }) => ({
    team: one(teams, {
        fields: [wfWorkingHoursConfig.teamId],
        references: [teams.id]
    })
}));

export type WorkflowTemplate = InferSelectModel<typeof wfTemplates>;
export type WorkflowStep = InferSelectModel<typeof wfSteps>;
export type WorkflowInstance = InferSelectModel<typeof wfInstances>;
export type WorkflowStepInstance = InferSelectModel<typeof wfStepInstances>;
export type WorkflowTimerEvent = InferSelectModel<typeof wfTimerEvents>;
export type WorkflowBusinessCalendar = InferSelectModel<typeof wfBusinessCalendar>;
export type WorkflowWorkingHoursConfig = InferSelectModel<typeof wfWorkingHoursConfig>;

export type NewWorkflowTemplate = Omit<InferInsertModel<typeof wfTemplates>, 'id' | 'createdAt' | 'updatedAt'>;
export type NewWorkflowStep = Omit<InferInsertModel<typeof wfSteps>, 'id' | 'createdAt' | 'updatedAt'>;
export type NewWorkflowInstance = Omit<InferInsertModel<typeof wfInstances>, 'id' | 'createdAt' | 'updatedAt'>;
export type NewWorkflowStepInstance = Omit<InferInsertModel<typeof wfStepInstances>, 'id' | 'createdAt' | 'updatedAt'>;
export type NewWorkflowTimerEvent = Omit<InferInsertModel<typeof wfTimerEvents>, 'id' | 'createdAt'>;
export type NewWorkflowBusinessCalendar = Omit<InferInsertModel<typeof wfBusinessCalendar>, 'id' | 'createdAt'>;
export type NewWorkflowWorkingHoursConfig = Omit<InferInsertModel<typeof wfWorkingHoursConfig>, 'id' | 'createdAt' | 'updatedAt'>;
