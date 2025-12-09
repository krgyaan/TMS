import { relations } from 'drizzle-orm';
import { imprestCategories } from './imprest-categories.schema';

export const imprestCategoriesRelations = relations(imprestCategories, () => ({}));
