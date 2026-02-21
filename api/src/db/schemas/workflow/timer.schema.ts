import { pgTable, bigserial, varchar, bigint, timestamp, index, unique, pgEnum, jsonb, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '@db/schemas/auth';

export const timerStatusEnum = pgEnum('timer_status', [
    'not_started',
    'running',
    'paused',
    'completed',
    'overdue',
    'cancelled'
]);

export const entityTypeEnum = pgEnum('entity_type', [
    'TENDER',
    'COURIER',
    'EMD',
    'SERVICE',
    'OPERATION'
]);

export const timerTrackers = pgTable('timers', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: bigint('entity_id', { mode: 'number' }).notNull(),
    stage: varchar('stage', { length: 100 }).notNull(),
    assignedUserId: bigint('assigned_user_id', { mode: 'number' }).references(() => users.id),
    allocatedTimeMs: bigint('allocated_time_ms', { mode: 'number' }).notNull(),
    status: timerStatusEnum('status').notNull().default('not_started'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    deadlineAt: timestamp('deadline_at', { withTimezone: true }),
    totalPausedDurationMs: bigint('total_paused_duration_ms', { mode: 'number' }).notNull().default(0),
    totalExtensionMs: bigint('total_extension_ms', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdByUserId: bigint('created_by_user_id', { mode: 'number' }).references(() => users.id),
    metadata: jsonb('metadata').default({}),
}, (table) => ([
    { entityIdx: index('idx_timer_entity').on(table.entityType, table.entityId) },
    { statusIdx: index('idx_timer_status').on(table.status) },
    { deadlineIdx: index('idx_timer_deadline').on(table.deadlineAt) },
    { assignedIdx: index('idx_timer_assigned').on(table.assignedUserId) },
    { uniqueActiveTimer: unique('unique_active_timer').on(table.entityType, table.entityId, table.stage) },
]));

export const timerEvents = pgTable('timer_events', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    trackerId: bigint('tracker_id', { mode: 'number' }).notNull().references(() => timerTrackers.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    previousStatus: timerStatusEnum('previous_status'),
    newStatus: timerStatusEnum('new_status'),
    performedByUserId: bigint('performed_by_user_id', { mode: 'number' }).references(() => users.id),
    reason: text('reason'),
    durationChangeMs: bigint('duration_change_ms', { mode: 'number' }),
    snapshot: jsonb('snapshot'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
    { trackerIdx: index('idx_events_tracker').on(table.trackerId) },
    { typeIdx: index('idx_events_type').on(table.eventType) },
    { userIdx: index('idx_events_user').on(table.performedByUserId) },
    { createdIdx: index('idx_events_created').on(table.createdAt) },
]));

export const timerTrackersRelations = relations(timerTrackers, ({ one, many }) => ({
    assignedUser: one(users, {
        fields: [timerTrackers.assignedUserId],
        references: [users.id],
    }),
    createdByUser: one(users, {
        fields: [timerTrackers.createdByUserId],
        references: [users.id],
    }),
    events: many(timerEvents),
}));

export const timerEventsRelations = relations(timerEvents, ({ one }) => ({
    tracker: one(timerTrackers, {
        fields: [timerEvents.trackerId],
        references: [timerTrackers.id],
    }),
    performedByUser: one(users, {
        fields: [timerEvents.performedByUserId],
        references: [users.id],
    }),
}));

export type TimerTracker = typeof timerTrackers.$inferSelect;
export type NewTimerTracker = typeof timerTrackers.$inferInsert;
export type TimerEvent = typeof timerEvents.$inferSelect;
export type NewTimerEvent = typeof timerEvents.$inferInsert;
export type TimerStatus = typeof timerStatusEnum.enumValues[number];
