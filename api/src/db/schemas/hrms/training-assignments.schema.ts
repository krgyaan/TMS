import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';
import { trainingVideos } from './training-videos.schema';

export const trainingAssignments = pgTable('hrms_training_assignments', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    videoId: bigint('video_id', { mode: 'number' }).notNull().references(() => trainingVideos.id),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
    assignedBy: bigint('assigned_by', { mode: 'number' }).notNull().references(() => users.id),
    status: varchar('status', { length: 50 }).notNull().default('Assigned'), // 'Assigned', 'In Progress', 'Completed'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingAssignment = typeof trainingAssignments.$inferSelect;
export type NewTrainingAssignment = typeof trainingAssignments.$inferInsert;
