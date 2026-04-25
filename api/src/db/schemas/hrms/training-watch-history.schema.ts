import {
  pgTable, bigserial, bigint, integer,
  boolean, timestamp, numeric, unique
} from 'drizzle-orm/pg-core';

export const trainingWatchHistory = pgTable('hrms_training_watch_history', {
  id:               bigserial('id', { mode: 'number' }).primaryKey(),
  userId:           bigint('user_id', { mode: 'number' }).notNull(),
  videoId:          bigint('video_id', { mode: 'number' }).notNull(),
  lastPositionSecs: integer('last_position_secs').notNull().default(0),
  totalWatchSecs:   integer('total_watch_secs').notNull().default(0),
  watchCount:       integer('watch_count').notNull().default(0),
  completionPct:    numeric('completion_pct', { precision: 5, scale: 2 }).default('0'),
  isCompleted:      boolean('is_completed').notNull().default(false),
  firstWatchedAt:   timestamp('first_watched_at', { withTimezone: true }),
  lastWatchedAt:    timestamp('last_watched_at', { withTimezone: true }),
  completedAt:      timestamp('completed_at', { withTimezone: true }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
},
(table) => ({
  userVideoUnique: unique().on(table.userId, table.videoId),
}));

export type TrainingWatchHistory = typeof trainingWatchHistory.$inferSelect;
export type NewTrainingWatchHistory = typeof trainingWatchHistory.$inferInsert;
