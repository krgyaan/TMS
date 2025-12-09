import { relations } from 'drizzle-orm';
import { oauthAccounts } from '@db/schemas/auth/oauth-accounts.schema';
import { users } from '@db/schemas/auth/users.schema';

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));
