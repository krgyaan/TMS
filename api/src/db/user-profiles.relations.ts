import { relations } from 'drizzle-orm';
import { userProfiles } from './user-profiles.schema';
import { users } from './users.schema';
import { designations } from './designations.schema';
import { teams } from './teams.schema';

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
