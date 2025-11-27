import { relations } from 'drizzle-orm';
import { oauthAccounts } from './oauth-accounts.schema';
import { users } from './users.schema';

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));
