import {
  pgTable, bigserial, bigint, text,
  boolean, timestamp, jsonb, integer, varchar, unique
} from 'drizzle-orm/pg-core';

export const trainingComments = pgTable('hrms_training_comments', {
  id:               bigserial('id', { mode: 'number' }).primaryKey(),
  videoId:          bigint('video_id', { mode: 'number' }).notNull(),
  userId:           bigint('user_id', { mode: 'number' }).notNull(),
  parentCommentId:  bigint('parent_comment_id', { mode: 'number' }),
  depthLevel:       integer('depth_level').notNull().default(0),
  body:             text('body').notNull(),
  isEdited:         boolean('is_edited').notNull().default(false),
  editedAt:         timestamp('edited_at', { withTimezone: true }),
  originalBody:     text('original_body'),
  reactionCounts:   jsonb('reaction_counts').default({}),
  isDeleted:        boolean('is_deleted').notNull().default(false),
  deletedAt:        timestamp('deleted_at', { withTimezone: true }),
  deletedBy:        bigint('deleted_by', { mode: 'number' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TrainingComment = typeof trainingComments.$inferSelect;
export type NewTrainingComment = typeof trainingComments.$inferInsert;

export const trainingCommentReactions = pgTable('hrms_training_comment_reactions', {
  id:           bigserial('id', { mode: 'number' }).primaryKey(),
  commentId:    bigint('comment_id', { mode: 'number' }).notNull(),
  userId:       bigint('user_id', { mode: 'number' }).notNull(),
  reactionType: varchar('reaction_type', { length: 50 }).notNull(),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
},
(table) => ({
  userCommentReactionUnique: unique().on(table.userId, table.commentId, table.reactionType),
}));

export type TrainingCommentReaction = typeof trainingCommentReactions.$inferSelect;
export type NewTrainingCommentReaction = typeof trainingCommentReactions.$inferInsert;
