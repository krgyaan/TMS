import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
    unique
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';
import { trainingVideos } from './training-videos.schema';

export const trainingVideoReactions = pgTable('hrms_training_video_reactions', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    videoId: bigint('video_id', { mode: 'number' }).notNull().references(() => trainingVideos.id),
    userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
    reaction: varchar('reaction', { length: 50 }).notNull(), // 'helpful', 'important', 'confusing'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
},
(table) => ({
    userVideoReactionUnique: unique().on(table.userId, table.videoId, table.reaction),
}));

export type TrainingVideoReaction = typeof trainingVideoReactions.$inferSelect;
export type NewTrainingVideoReaction = typeof trainingVideoReactions.$inferInsert;
