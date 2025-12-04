import { relations } from 'drizzle-orm';
import { items } from './items.schema';
import { teams } from './teams.schema';
import { itemHeadings } from './item-headings.schema';
import { tenderInfos } from './tenders.schema';
import { projects } from './projects.schema';

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
