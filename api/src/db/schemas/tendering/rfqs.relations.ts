import { relations } from 'drizzle-orm';
import {
    rfqs,
    rfqItems,
    rfqDocuments,
    rfqResponses,
    rfqResponseItems,
    rfqResponseDocuments,
} from '@db/schemas/tendering/rfqs.schema';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { vendors } from '@db/schemas/vendors/vendors.schema';

export const rfqsRelations = relations(rfqs, ({ one, many }) => ({
    tender: one(tenderInfos, {
        fields: [rfqs.tenderId],
        references: [tenderInfos.id],
    }),
    rfqItems: many(rfqItems),
    rfqDocuments: many(rfqDocuments),
    rfqResponses: many(rfqResponses),
}));

export const rfqItemsRelations = relations(rfqItems, ({ one }) => ({
    rfq: one(rfqs, {
        fields: [rfqItems.rfqId],
        references: [rfqs.id],
    }),
}));

export const rfqDocumentsRelations = relations(rfqDocuments, ({ one }) => ({
    rfq: one(rfqs, {
        fields: [rfqDocuments.rfqId],
        references: [rfqs.id],
    }),
}));

export const rfqResponsesRelations = relations(rfqResponses, ({ one, many }) => ({
    rfq: one(rfqs, {
        fields: [rfqResponses.rfqId],
        references: [rfqs.id],
    }),
    vendor: one(vendors, {
        fields: [rfqResponses.vendorId],
        references: [vendors.id],
    }),
    rfqResponseItems: many(rfqResponseItems),
    rfqResponseDocuments: many(rfqResponseDocuments),
}));

export const rfqResponseItemsRelations = relations(rfqResponseItems, ({ one }) => ({
    rfqResponse: one(rfqResponses, {
        fields: [rfqResponseItems.rfqResponseId],
        references: [rfqResponses.id],
    }),
}));

export const rfqResponseDocumentsRelations = relations(rfqResponseDocuments, ({ one }) => ({
    rfqResponse: one(rfqResponses, {
        fields: [rfqResponseDocuments.rfqResponseId],
        references: [rfqResponses.id],
    }),
}));
