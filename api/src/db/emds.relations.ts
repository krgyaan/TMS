import { relations } from 'drizzle-orm';
import {
    paymentRequests,
    paymentInstruments,
    instrumentDdDetails,
    instrumentFdrDetails,
    instrumentBgDetails,
    instrumentChequeDetails,
    instrumentTransferDetails,
} from './emds.schema';
import { tenderInfos } from './tenders.schema';

export const paymentRequestRelations = relations(paymentRequests, ({ one, many }) => ({
    tender: one(tenderInfos, {
        fields: [paymentRequests.tenderId],
        references: [tenderInfos.id],
    }),
    instruments: many(paymentInstruments),
}));

export const paymentInstrumentRelations = relations(paymentInstruments, ({ one }) => ({
    request: one(paymentRequests, {
        fields: [paymentInstruments.requestId],
        references: [paymentRequests.id],
    }),
    ddDetails: one(instrumentDdDetails),
    fdrDetails: one(instrumentFdrDetails),
    bgDetails: one(instrumentBgDetails),
    chequeDetails: one(instrumentChequeDetails),
    transferDetails: one(instrumentTransferDetails),
}));

export const instrumentDdDetailsRelations = relations(instrumentDdDetails, ({ one }) => ({
    instrument: one(paymentInstruments, {
        fields: [instrumentDdDetails.instrumentId],
        references: [paymentInstruments.id],
    }),
}));

export const instrumentFdrDetailsRelations = relations(instrumentFdrDetails, ({ one }) => ({
    instrument: one(paymentInstruments, {
        fields: [instrumentFdrDetails.instrumentId],
        references: [paymentInstruments.id],
    }),
}));

export const instrumentBgDetailsRelations = relations(instrumentBgDetails, ({ one }) => ({
    instrument: one(paymentInstruments, {
        fields: [instrumentBgDetails.instrumentId],
        references: [paymentInstruments.id],
    }),
}));

export const instrumentChequeDetailsRelations = relations(instrumentChequeDetails, ({ one }) => ({
    instrument: one(paymentInstruments, {
        fields: [instrumentChequeDetails.instrumentId],
        references: [paymentInstruments.id],
    }),
}));

export const instrumentTransferDetailsRelations = relations(instrumentTransferDetails, ({ one }) => ({
    instrument: one(paymentInstruments, {
        fields: [instrumentTransferDetails.instrumentId],
        references: [paymentInstruments.id],
    }),
}));
