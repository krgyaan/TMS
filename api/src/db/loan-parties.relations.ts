import { relations } from 'drizzle-orm';
import { loanParties } from './loan-parties.schema';

export const loanPartiesRelations = relations(loanParties, () => ({}));
