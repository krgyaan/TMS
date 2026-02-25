import { relations } from 'drizzle-orm';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';
import { users } from '@db/schemas/auth/users.schema';
import { designations } from '@db/schemas/master/designations.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { employeeDocuments } from '@db/schemas/hrms/employee-documents.schema';
import { employeeAssets } from '@db/schemas/hrms/employee-assets.schema';

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
    user: one(users, {
        fields: [userProfiles.userId],
        references: [users.id],
        relationName: 'user',
    }),
    designation: one(designations, {
        fields: [userProfiles.designationId],
        references: [designations.id],
    }),
    primaryTeam: one(teams, {
        fields: [userProfiles.primaryTeamId],
        references: [teams.id],
    }),
    reportingManager: one(users, {
        fields: [userProfiles.reportingManagerId],
        references: [users.id],
        relationName: 'reportingManager',
    }),
    documents: many(employeeDocuments),
    assets: many(employeeAssets),
}));
