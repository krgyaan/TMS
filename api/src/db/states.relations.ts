import { relations } from 'drizzle-orm';
import { states } from './states.schema';

export const statesRelations = relations(states, () => ({}));
