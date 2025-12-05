import { relations } from 'drizzle-orm';
import { designations } from '@db/schemas/master/designations.schema';
import { userProfiles } from '@db/schemas/auth/user-profiles.schema';

export const designationsRelations = relations(designations, ({ many }) => ({
  userProfiles: many(userProfiles),
}));
