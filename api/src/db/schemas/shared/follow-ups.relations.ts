import { relations } from "drizzle-orm";
import { users } from "../auth/users.schema";
import { followUps } from "./follow-ups.schema";
import { followUpPersons } from "./follow-up-persons.schema";

// User relations
// export const usersRelations = relations(users, ({ many }) => ({
//     assignedFollowUps: many(followUps, { relationName: "assignedTo" }),
//     createdFollowUps: many(followUps, { relationName: "createdBy" }),
// }));

// FollowUp relations
export const followUpsRelations = relations(followUps, ({ one, many }) => ({
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
    contacts: many(followUpPersons),
}));

//Follow up persons relation
export const followUpPersonsRelations = relations(followUpPersons, ({ one }) => ({
    followUp: one(followUps, {
        fields: [followUpPersons.followUpId],
        references: [followUps.id],
    }),
}));
