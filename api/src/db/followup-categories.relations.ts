import { relations } from 'drizzle-orm';
import { followupCategories } from './followup-categories.schema';

export const followupCategoriesRelations = relations(followupCategories, () => ({}));
