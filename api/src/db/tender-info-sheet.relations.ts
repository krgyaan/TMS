import { relations } from 'drizzle-orm';
import {
  tenderInformation,
  tenderClients,
  tenderTechnicalDocuments,
  tenderFinancialDocuments,
} from './tender-info-sheet.schema';

export const tenderInformationRelations = relations(tenderInformation, ({ many }) => ({
  clients: many(tenderClients),
  workOrders: many(tenderTechnicalDocuments),
  financialDocuments: many(tenderFinancialDocuments),
}));

export const tenderClientsRelations = relations(tenderClients, ({ one }) => ({
  tender: one(tenderInformation, {
    fields: [tenderClients.tenderId],
    references: [tenderInformation.tenderId],
  }),
}));

export const tenderTechnicalDocumentsRelations = relations(tenderTechnicalDocuments, ({ one }) => ({
  tender: one(tenderInformation, {
    fields: [tenderTechnicalDocuments.tenderId],
    references: [tenderInformation.tenderId],
  }),
}));

export const tenderFinancialDocumentsRelations = relations(tenderFinancialDocuments, ({ one }) => ({
  tender: one(tenderInformation, {
    fields: [tenderFinancialDocuments.tenderId],
    references: [tenderInformation.tenderId],
  }),
}));
