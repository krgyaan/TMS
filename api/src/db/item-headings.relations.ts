import { relations } from 'drizzle-orm';
import { itemHeadings } from './item-headings.schema';
import { teams } from './teams.schema';
import { items } from './items.schema';

export const itemHeadingsRelations = relations(itemHeadings, ({ one, many }) => ({
  team: one(teams, {
    fields: [itemHeadings.teamId],
    references: [teams.id],
  }),
  items: many(items),
}));
