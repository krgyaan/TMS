import {
  pgTable, bigserial, bigint, varchar,
  integer, boolean, timestamp, jsonb, text
} from 'drizzle-orm/pg-core';

export const trainingVideos = pgTable('hrms_training_videos', {
  id:                 bigserial('id', { mode: 'number' }).primaryKey(),
  videoCode:          varchar('video_code', { length: 50 }).notNull().unique(),
  youtubeUrl:         varchar('youtube_url', { length: 500 }).notNull(),
  youtubeVideoId:     varchar('youtube_video_id', { length: 50 }).notNull(),
  title:              varchar('title', { length: 500 }).notNull(),
  description:        text('description'),
  thumbnailUrl:       varchar('thumbnail_url', { length: 500 }),
  customThumbnail:    varchar('custom_thumbnail', { length: 500 }),
  durationSeconds:    integer('duration_seconds'),
  category:           varchar('category', { length: 255 }).notNull(),
  subCategory:        varchar('sub_category', { length: 255 }),
  tags:               jsonb('tags').default([]),
  language:           varchar('language', { length: 50 }).notNull().default('english'),
  audienceType:       varchar('audience_type', { length: 50 }).notNull().default('all'),
  targetTeamIds:      jsonb('target_team_ids').default([]),
  targetUserIds:      jsonb('target_user_ids').default([]),
  targetDesignations: jsonb('target_designations').default([]),
  prerequisites:      text('prerequisites'),
  attachments:        jsonb('attachments').default([]),
  relatedVideoIds:    jsonb('related_video_ids').default([]),
  trainerId:          bigint('trainer_id', { mode: 'number' }),
  externalTrainer:    varchar('external_trainer', { length: 255 }),
  allowComments:      boolean('allow_comments').notNull().default(true),
  allowDownloads:     boolean('allow_downloads').notNull().default(false),
  isPublished:        boolean('is_published').notNull().default(false),
  createdBy:          bigint('created_by', { mode: 'number' }),
  lastModifiedBy:     bigint('last_modified_by', { mode: 'number' }),
  versionNumber:      integer('version_number').notNull().default(1),
  internalNotes:      text('internal_notes'),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type NewTrainingVideo = typeof trainingVideos.$inferInsert;
