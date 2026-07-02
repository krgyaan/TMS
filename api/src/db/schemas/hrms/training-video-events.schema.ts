import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    integer,
    timestamp
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';
import { trainingVideos } from './training-videos.schema';

export const trainingVideoEvents = pgTable('hrms_training_video_events', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    videoId: bigint('video_id', { mode: 'number' }).notNull().references(() => trainingVideos.id),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
    eventType: varchar('event_type', { length: 50 }).notNull(), // 'Play', 'Pause', 'Seek', 'Resume', 'Complete'
    position: integer('position').notNull(), // video timestamp in seconds
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingVideoEvent = typeof trainingVideoEvents.$inferSelect;
export type NewTrainingVideoEvent = typeof trainingVideoEvents.$inferInsert;
