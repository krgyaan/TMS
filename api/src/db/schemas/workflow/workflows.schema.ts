import {
    pgTable,
    varchar,
    text,
    timestamp,
    jsonb,
    integer,
    boolean,
    pgEnum,
    index,
    bigserial
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../auth/users.schema';

export const entityTypeEnum = pgEnum('entity_type', [
    'TENDER',
    'COURIER',
    'EMD',
    'SERVICE',
    'OPERATION',
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

export const stepStatusEnum = pgEnum('step_status', [
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED',
    'REJECTED',
    'ON_HOLD'
]);

/**
 * STEP INSTANCES
 * This is the main timer table (like Laravel's timer_trackers)
 */
export const stepInstances = pgTable('step_instances', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    // ============================================
    // POLYMORPHIC RELATIONSHIP (Multi-module support)
    // ============================================
    entityType: entityTypeEnum('entity_type').notNull(),
    entityId: bigserial('entity_id', { mode: 'number' }).notNull(),
    // Example: { entityType: 'TENDER', entityId: 'tender-uuid-123' }
    // Example: { entityType: 'COURIER', entityId: 'courier-uuid-456' }
    // Example: { entityType: 'EMD', entityId: 'emd-uuid-789' }

    // ============================================
    // STEP IDENTIFICATION
    // ============================================
    stepKey: varchar('step_key', { length: 100 }).notNull(),
    // 'tender_info', 'tender_approval', 'emd', 'courier_created', etc.

    stepName: varchar('step_name', { length: 255 }).notNull(),
    // 'Tender Info', 'Tender Approval', 'EMD', 'Courier Created', etc.

    stepOrder: integer('step_order').notNull(),
    // 1, 2, 3, 4... (sequence of steps)

    // ============================================
    // ASSIGNMENT
    // ============================================
    assignedToUserId: bigserial('assigned_to_user_id', { mode: 'number' }).references(() => users.id),
    assignedRole: varchar('assigned_role', { length: 50 }),
    // 'TE', 'TL', 'AC', 'SERVICE_EXEC', etc.

    // ============================================
    // TIMER CONFIGURATION (Embedded - not separate table!)
    // ============================================
    timerConfig: jsonb('timer_config').$type<{
        type: 'FIXED_DURATION' | 'DEADLINE_BASED' | 'NEGATIVE_COUNTDOWN' | 'DYNAMIC' | 'NO_TIMER';
        durationHours?: number;
        hoursBeforeDeadline?: number;
        isBusinessDaysOnly?: boolean;
        warningThreshold?: number;
        criticalThreshold?: number;
    }>().notNull(),
    // Example: { type: 'FIXED_DURATION', durationHours: 72, isBusinessDaysOnly: true, warningThreshold: 80, criticalThreshold: 100 }
    // Example: { type: 'NEGATIVE_COUNTDOWN', hoursBeforeDeadline: -72, warningThreshold: 80, criticalThreshold: 100 }
    // Example: { type: 'NO_TIMER' }

    // ============================================
    // STATUS
    // ============================================
    status: stepStatusEnum('status').default('PENDING').notNull(),
    timerStatus: timerStatusEnum('timer_status').default('NOT_STARTED').notNull(),

    // ============================================
    // TIME TRACKING (Like Laravel timer_trackers)
    // ============================================
    actualStartAt: timestamp('actual_start_at'),
    actualEndAt: timestamp('actual_end_at'),
    customDeadline: timestamp('custom_deadline'), // For deadline-based timers

    // ============================================
    // PAUSE/EXTENSION TRACKING
    // ============================================
    totalPausedDurationMs: integer('total_paused_duration_ms').default(0).notNull(),
    extensionDurationMs: integer('extension_duration_ms').default(0).notNull(),

    // ============================================
    // PERFORMANCE METRICS (Calculated on completion)
    // ============================================
    allocatedTimeMs: integer('allocated_time_ms'),
    // How much time was allocated (durationHours * 3600000)

    actualTimeMs: integer('actual_time_ms'),
    // How much time actually taken (actualEndAt - actualStartAt - pauses)

    remainingTimeMs: integer('remaining_time_ms'),
    // How much time was left when completed (can be negative if overdue)

    // ============================================
    // WORKFLOW CONTEXT
    // ============================================
    workflowCode: varchar('workflow_code', { length: 50 }),
    // 'TENDERING_WF', 'COURIER_WF', 'EMD_WF' (helps group steps)

    // ============================================
    // DEPENDENCIES & FLOW
    // ============================================
    dependsOnSteps: jsonb('depends_on_steps').$type<string[]>(),
    // ['tender_info', 'tender_approval'] - steps that must complete first

    canRunInParallel: boolean('can_run_in_parallel').default(false).notNull(),

    // ============================================
    // REJECTION/REWORK
    // ============================================
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),
    rejectionCount: integer('rejection_count').default(0).notNull(),

    // ============================================
    // METADATA (Flexible storage)
    // ============================================
    metadata: jsonb('metadata').$type<{
        // Laravel migration data
        migratedFromLaravel?: boolean;
        originalTimerId?: number;
        laravelStage?: string;
        laravelRemainingTime?: number;

        // Conditional logic
        conditionalField?: string;
        conditionalValue?: any;

        // Custom data
        notes?: string;
        tags?: string[];
        [key: string]: any;
    }>(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ([
    // Indexes for fast queries
    { entityIdx: index('step_instances_entity_idx').on(table.entityType, table.entityId) },
    { timerStatusIdx: index('step_instances_timer_status_idx').on(table.timerStatus) },
    { assignedUserIdx: index('step_instances_assigned_user_idx').on(table.assignedToUserId) },
    { stepKeyIdx: index('step_instances_step_key_idx').on(table.stepKey) },
    { workflowCodeIdx: index('step_instances_workflow_code_idx').on(table.workflowCode) }
]));

/**
 * TIMER EVENTS
 * Complete history of every action on timers
 * NEW - you didn't have this in Laravel!
 */
export const timerEvents = pgTable('timer_events', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    stepInstanceId: bigserial('step_instance_id', { mode: 'number' })
        .references(() => stepInstances.id, { onDelete: 'cascade' })
        .notNull(),

    // Event type
    eventType: varchar('event_type', { length: 50 }).notNull(),
    // Values: START, PAUSE, RESUME, COMPLETE, EXTEND, RESET, SKIP, CANCEL, REJECT, APPROVE

    performedByUserId: bigserial('performed_by_user_id', { mode: 'number' }).references(() => users.id),

    // State changes
    previousStatus: timerStatusEnum('previous_status'),
    newStatus: timerStatusEnum('new_status'),

    // Additional data
    durationChangeMs: integer('duration_change_ms'), // For extensions
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
    { stepInstanceIdx: index('timer_events_step_instance_idx').on(table.stepInstanceId) },
    { eventTypeIdx: index('timer_events_type_idx').on(table.eventType) },
    { performedByIdx: index('timer_events_performed_by_idx').on(table.performedByUserId) },
    { createdAtIdx: index('timer_events_created_idx').on(table.createdAt) },
]));

/**
 * BUSINESS CALENDAR
 * Track holidays and non-working days
 */
export const businessCalendar = pgTable('business_calendar', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    date: timestamp('date', { mode: 'date' }).notNull().unique(),

    isHoliday: boolean('is_holiday').default(false).notNull(),
    isWeekend: boolean('is_weekend').default(false).notNull(),

    holidayName: varchar('holiday_name', { length: 255 }),
    holidayType: varchar('holiday_type', { length: 50 }), // 'NATIONAL', 'REGIONAL', 'COMPANY'
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ([
    { dateIdx: index('business_calendar_date_idx').on(table.date) },
    { isHolidayIdx: index('business_calendar_holiday_idx').on(table.isHoliday) },
]));

/**
 * APP SETTINGS
 * Store all configuration as JSON
 * Replaces: working_hours_config, workflow_templates, etc.
 */
export const appSettings = pgTable('app_settings', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    key: varchar('key', { length: 100 }).notNull().unique(),
    // 'working_hours', 'notification_settings', 'timer_defaults', etc.

    value: jsonb('value').notNull().$type<any>(),
    // Flexible JSON storage

    description: text('description'),
    category: varchar('category', { length: 50 }),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    updatedBy: bigserial('updated_by', { mode: 'number' }).references(() => users.id),
});


export const stepInstancesRelations = relations(stepInstances, ({ one, many }) => ({
    assignedTo: one(users, {
        fields: [stepInstances.assignedToUserId],
        references: [users.id]
    }),
    events: many(timerEvents)
}));

export const timerEventsRelations = relations(timerEvents, ({ one }) => ({
    stepInstance: one(stepInstances, {
        fields: [timerEvents.stepInstanceId],
        references: [stepInstances.id]
    }),
    performedBy: one(users, {
        fields: [timerEvents.performedByUserId],
        references: [users.id]
    })
}));
