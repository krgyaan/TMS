import { relations } from 'drizzle-orm';
import { documentsSubmitted } from '@db/schemas/master/documents-submitted.schema';

export const documentsSubmittedRelations = relations(documentsSubmitted, () => ({}));
