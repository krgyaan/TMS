import { relations } from "drizzle-orm";
import { users } from "./users.schema";
import { followUps } from "./follow-ups.schema";
import { followupCategories } from "./followup-categories.schema";

// User relations
export const usersRelations = relations(users, ({ many }) => ({
    assignedFollowUps: many(followUps, { relationName: "assignedTo" }),
    createdFollowUps: many(followUps, { relationName: "createdBy" }),
}));

// FollowUp relations
export const followUpsRelations = relations(followUps, ({ one }) => ({
    assignee: one(users, {
        fields: [followUps.assignedToId],
        references: [users.id],
        relationName: "assignedTo",
    }),
    creator: one(users, {
        fields: [followUps.createdById],
        references: [users.id],
        relationName: "createdBy",
    }),
    category: one(followupCategories, {
        fields: [followUps.categoryId],
        references: [followupCategories.id],
    }),
}));

// FollowupCategory relations
export const followupCategoriesRelations = relations(followupCategories, ({ many }) => ({
    followUps: many(followUps),
}));
