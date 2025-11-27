import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { userProfiles } from './user-profiles.schema';
import { oauthAccounts } from './oauth-accounts.schema';
import { tenderInfos } from './tenders.schema';
import { tenderStatusHistory } from './tender-status-history.schema';

export const usersRelations = relations(users, ({ many }) => ({
  userProfiles: many(userProfiles),
  oauthAccounts: many(oauthAccounts),
  tenderInfos: many(tenderInfos, {
    relationName: 'teamMember',
  }),
  tenderStatusHistory: many(tenderStatusHistory, {
    relationName: 'changedBy',
  }),
}));
