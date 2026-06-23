import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    integer,
    boolean,
    timestamp,
    jsonb,
    text
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';

export const trainingVideos = pgTable('hrms_training_videos', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    videoCode: varchar('video_code', { length: 50 }).notNull().unique(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    filename: varchar('filename', { length: 255 }).notNull(),
    filepath: varchar('filepath', { length: 500 }).notNull(),
    filesize: bigint('filesize', { mode: 'number' }).notNull(),
    durationSeconds: integer('duration_seconds'), // populated post-upload by worker
    resolution: varchar('resolution', { length: 50 }), // populated post-upload by worker
    thumbnailPath: varchar('thumbnail_path', { length: 500 }), // populated post-upload by worker
    status: varchar('status', { length: 50 }).notNull().default('processing'), // 'processing', 'ready', 'failed'
    storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('VPS'), // 'VPS', 'S3', etc.
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    completionThreshold: integer('completion_threshold').notNull().default(90), // percentage watched needed for completion
    category: varchar('category', { length: 255 }),
    subCategory: varchar('sub_category', { length: 255 }),
    tags: jsonb('tags').default([]),
    isPublished: boolean('is_published').notNull().default(true),
    uploadedBy: bigint('uploaded_by', { mode: 'number' }).references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type NewTrainingVideo = typeof trainingVideos.$inferInsert;
