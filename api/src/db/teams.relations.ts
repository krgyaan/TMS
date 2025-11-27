import { relations } from 'drizzle-orm';
import { teams } from './teams.schema';
import { userProfiles } from './user-profiles.schema';
import { items } from './items.schema';
import { itemHeadings } from './item-headings.schema';
import { tenderInfos } from './tenders.schema';

export const teamsRelations = relations(teams, ({ one, many }) => ({
  parent: one(teams, {
    fields: [teams.parentId],
    references: [teams.id],
    relationName: 'parent',
  }),
  children: many(teams, {
    relationName: 'parent',
  }),
  userProfiles: many(userProfiles),
  items: many(items),
  itemHeadings: many(itemHeadings),
  tenderInfos: many(tenderInfos),
}));
