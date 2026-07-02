import {
    pgTable,
    bigserial,
    bigint,
    text,
    boolean,
    timestamp,
    integer
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';
import { trainingVideos } from './training-videos.schema';

export const trainingComments = pgTable('hrms_training_comments', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    videoId: bigint('video_id', { mode: 'number' }).notNull().references(() => trainingVideos.id),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
    parentCommentId: bigint('parent_comment_id', { mode: 'number' }),
    depthLevel: integer('depth_level').notNull().default(0),
    body: text('body').notNull(),
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    originalBody: text('original_body'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: bigint('deleted_by', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingComment = typeof trainingComments.$inferSelect;
export type NewTrainingComment = typeof trainingComments.$inferInsert;
