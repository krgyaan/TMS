import { relations } from 'drizzle-orm';
import { items } from '@db/schemas/master/items.schema';
import { teams } from '@db/schemas/master/teams.schema';
import { itemHeadings } from '@db/schemas/master/item-headings.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { projects } from '@db/schemas/master/projects.schema';

export const itemsRelations = relations(items, ({ one, many }) => ({
  team: one(teams, {
    fields: [items.teamId],
    references: [teams.id],
  }),
  heading: one(itemHeadings, {
    fields: [items.headingId],
    references: [itemHeadings.id],
  }),
  tenderInfos: many(tenderInfos),
  projects: many(projects),
}));
