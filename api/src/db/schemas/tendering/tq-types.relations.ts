import { relations } from 'drizzle-orm';
import { tqTypes } from '@db/schemas/tendering/tq-types.schema';

export const tqTypesRelations = relations(tqTypes, () => ({}));
