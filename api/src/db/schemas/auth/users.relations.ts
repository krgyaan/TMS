import { relations } from "drizzle-orm";
import { users } from "@db/schemas/auth/users.schema";
import { userProfiles } from "@db/schemas/auth/user-profiles.schema";
import { oauthAccounts } from "@db/schemas/auth/oauth-accounts.schema";
import { tenderInfos } from "@db/schemas/tendering/tenders.schema";
import { tenderStatusHistory } from "@db/schemas/tendering/tender-status-history.schema";
import { followUps } from "../shared";

export const usersRelations = relations(users, ({ many }) => ({
    userProfiles: many(userProfiles),
    oauthAccounts: many(oauthAccounts),
    tenderInfos: many(tenderInfos, {
        relationName: "teamMember",
    }),
    tenderStatusHistory: many(tenderStatusHistory, {
        relationName: "changedBy",
    }),
    assignedFollowUps: many(followUps, {
        relationName: "assignedTo",
    }),

    createdFollowUps: many(followUps, {
        relationName: "createdBy",
    }),
}));
