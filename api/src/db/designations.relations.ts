import { relations } from 'drizzle-orm';
import { designations } from './designations.schema';
import { userProfiles } from './user-profiles.schema';

export const designationsRelations = relations(designations, ({ many }) => ({
  userProfiles: many(userProfiles),
}));
