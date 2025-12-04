import { relations } from 'drizzle-orm';
import { documentsSubmitted } from './documents-submitted.schema';

export const documentsSubmittedRelations = relations(documentsSubmitted, () => ({}));
