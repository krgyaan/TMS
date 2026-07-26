import { relations } from 'drizzle-orm';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';
import { users } from '@db/schemas/auth/users.schema';

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
    user: one(users, {
        fields: [userProfiles.userId],
        references: [users.id],
    }),
}));
