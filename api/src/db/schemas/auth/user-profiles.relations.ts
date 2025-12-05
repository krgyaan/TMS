import { relations } from 'drizzle-orm';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';
import { users } from '@db/schemas/auth/users.schema';
import { designations } from '@db/schemas/master/designations.schema';
import { teams } from '@db/schemas/master/teams.schema';

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
    user: one(users, {
        fields: [userProfiles.userId],
        references: [users.id],
    }),
    designation: one(designations, {
        fields: [userProfiles.designationId],
        references: [designations.id],
    }),
    primaryTeam: one(teams, {
        fields: [userProfiles.primaryTeamId],
        references: [teams.id],
    }),
}));
