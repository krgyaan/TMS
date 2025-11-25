import { relations } from 'drizzle-orm';
import { pgTable, varchar, text, decimal, timestamp, date, pgEnum, serial, index, foreignKey, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenderInfos } from './tenders.schema';

// Enums
export const paymentPurposeEnum = pgEnum('payment_purpose', [
    'EMD',
    'Tender Fee',
    'Processing Fee',
    'Security Deposit',
    'Performance BG',
    'Surety Bond',
    'Other Payment',
]);

export const instrumentTypeEnum = pgEnum('instrument_type', [
    'DD',           // Demand Draft
    'FDR',          // Fixed Deposit Receipt
    'BG',           // Bank Guarantee
    'Cheque',
    'Bank Transfer',
    'Portal Payment',
    'Surety Bond',
]);

export const instrumentStatusEnum = pgEnum('instrument_status', [
    'Pending', 'Requested', 'Approved', 'Issued', 'Dispatched', 'Received', 'Returned', 'Cancelled',
    'Refunded', 'Encashed', 'Extended'
]);

export const paymentRequestTypeEnum = pgEnum('payment_request_type', [
    'TMS', 'Other Than TMS', 'Old Entries', 'Other Than Tender'
]);

export const paymentRequests = pgTable('payment_requests', {
    id: serial('id').primaryKey(),
    tenderId: integer('tender_id').notNull(),

    // From old `emds` table
    type: paymentRequestTypeEnum('type').default('TMS'), // old: emds.type
    tenderNo: varchar('tender_no', { length: 500 }).default('NA'), // old: emds.tender_no
    projectName: varchar('project_name', { length: 500 }), // old: emds.project_name

    purpose: paymentPurposeEnum('purpose').notNull(),
    amountRequired: decimal('amount_required', { precision: 18, scale: 2 }).notNull(),
    dueDate: timestamp('due_date'), // old: emds.due_date
    requestedBy: varchar('requested_by', { length: 200 }), // old: emds.requested_by

    status: varchar('status', { length: 50 }).default('Pending'),
    remarks: text('remarks'),

    // Migration helpers
    legacyEmdId: integer('legacy_emd_id'), // maps to old emds.id

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => {
    return [
        {
            fkTender: foreignKey({
                columns: [table.tenderId],
                foreignColumns: [tenderInfos.id],
                name: 'fk_payment_request_tender',
            }).onDelete('cascade')
        },
        { purposeIdx: index('payment_requests_purpose_idx').on(table.purpose) },
        { legacyEmdIdx: index('payment_requests_legacy_emd_id_idx').on(table.legacyEmdId) },
    ];
});

export const paymentInstruments = pgTable('payment_instruments', {
    id: serial('id').primaryKey(),
    requestId: integer('request_id').notNull(),

    instrumentType: instrumentTypeEnum('instrument_type').notNull(),

    // Common fields
    amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
    favouring: varchar('favouring', { length: 500 }), // old: dd_favour, cheque_favour, etc.
    payableAt: varchar('payable_at', { length: 500 }), // old: dd_payable, fdr_payable

    issueDate: date('issue_date'),     // old: dd_date, fdr_date, bg_date, cheque_date
    expiryDate: date('expiry_date'),   // old: fdr_expiry, bg_expiry
    validityDate: date('validity_date'), // BG validity
    claimExpiryDate: date('claim_expiry_date'), // BG claim expiry

    status: instrumentStatusEnum('instrument_status').default('Pending'),
    utr: varchar('utr', { length: 255 }),
    docketNo: varchar('docket_no', { length: 255 }).unique(),
    courierAddress: text('courier_address'), // old: courier_add, bg_courier_addr

    action: integer('action'), // old: action (int flag in all detail tables)

    // Courier deadline (in days or date)
    courierDeadline: integer('courier_deadline'), // old: courier_deadline (int)

    // Rejection / cancellation reasons
    rejectionReason: text('rejection_reason'), // old: reason, reason_req, stop_reason_text

    // File paths
    generatedPdf: varchar('generated_pdf', { length: 500 }), // main generated PDF
    cancelPdf: varchar('cancel_pdf', { length: 500 }), // cancellation PDF
    docketSlip: varchar('docket_slip', { length: 500 }),
    coveringLetter: varchar('covering_letter', { length: 500 }),
    extraPdfPaths: text('generated_pdfs'), // old: generated_pdfs (text array)

    // Extension & Cancellation workflow files
    extensionRequestPdf: varchar('extension_request_pdf', { length: 500 }), // old: request_extension_pdf
    cancellationRequestPdf: varchar('cancellation_request_pdf', { length: 500 }), // old: request_cancellation_pdf

    remarks: text('remarks'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => {
    return [
        {
            fkRequest: foreignKey({
                columns: [table.requestId],
                foreignColumns: [paymentRequests.id],
                name: 'fk_instrument_request',
            }).onDelete('cascade')
        },
        { typeIdx: index('instruments_type_idx').on(table.instrumentType) },
        { statusIdx: index('instruments_status_idx').on(table.status) },
        { utrIdx: index('instruments_utr_idx').on(table.utr) },
    ];
});

// DD - Demand Draft
export const instrumentDdDetails = pgTable('instrument_dd_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    ddNo: varchar('dd_no', { length: 100 }), // old: dd_no
    ddDate: date('dd_date'), // old: dd_date
    bankName: varchar('bank_name', { length: 300 }),
    reqNo: varchar('req_no', { length: 100 }), // old: req_no
}, (t) => [{ fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }]);

// FDR - Fixed Deposit Receipt
export const instrumentFdrDetails = pgTable('instrument_fdr_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    fdrNo: varchar('fdr_no', { length: 100 }), // old: fdr_no
    fdrDate: date('fdr_date'), // old: fdr_date
    fdrSource: varchar('fdr_source', { length: 200 }), // old: fdr_source
    roi: decimal('roi', { precision: 6, scale: 2 }), // old: fdr_roi
    marginPercent: decimal('margin_percent', { precision: 6, scale: 2 }),
    fdrPurpose: varchar('fdr_purpose', { length: 500 }), // old: fdr_purpose
}, (t) => [{ fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }]);

// BG - Bank Guarantee
export const instrumentBgDetails = pgTable('instrument_bg_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    bgNo: varchar('bg_no', { length: 100 }), // old: bg_no
    bgDate: date('bg_date'), // old: bg_date
    validityDate: date('validity_date'), // old: bg_validity
    claimExpiryDate: date('claim_expiry_date'), // old: claim_expiry
    beneficiaryName: varchar('beneficiary_name', { length: 500 }), // old: bg_favour
    beneficiaryAddress: text('beneficiary_address'), // old: bg_address
    bankName: varchar('bank_name', { length: 300 }), // old: bg_bank_name, new_bg_bank_name

    // Margin percentages
    cashMarginPercent: decimal('cash_margin_percent', { precision: 6, scale: 2 }), // old: bg_cont_percent
    fdrMarginPercent: decimal('fdr_margin_percent', { precision: 6, scale: 2 }), // old: bg_fdr_percent

    // Charges
    stampCharges: decimal('stamp_charges', { precision: 12, scale: 2 }), // old: bg_stamp
    sfmsCharges: decimal('sfms_charges', { precision: 12, scale: 2 }),

    // Deducted charges (actual debited)
    stampChargesDeducted: decimal('stamp_charges_deducted', { precision: 12, scale: 2 }), // old: stamp_charge_deducted, new_stamp_charge_deducted
    sfmsChargesDeducted: decimal('sfms_charges_deducted', { precision: 12, scale: 2 }), // old: sfms_charge_deducted
    otherChargesDeducted: decimal('other_charges_deducted', { precision: 12, scale: 2 }), // old: other_charge_deducted

    // Extension fields (for extended BG)
    extendedAmount: decimal('extended_amount', { precision: 18, scale: 2 }), // old: new_bg_amt
    extendedValidityDate: date('extended_validity_date'), // old: new_bg_expiry
    extendedClaimExpiryDate: date('extended_claim_expiry_date'), // old: new_bg_claim
    extendedBankName: varchar('extended_bank_name', { length: 300 }), // old: new_bg_bank_name

    // File paths
    extensionLetterPath: varchar('extension_letter_path', { length: 500 }), // old: ext_letter
    cancellationLetterPath: varchar('cancellation_letter_path', { length: 500 }),
    prefilledSignedBg: varchar('prefilled_signed_bg', { length: 500 }), // old: prefilled_signed_bg
}, (t) => [{ fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }]);

// Cheque
export const instrumentChequeDetails = pgTable('instrument_cheque_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    chequeNo: varchar('cheque_no', { length: 50 }), // old: cheq_no
    chequeDate: date('cheque_date'), // old: cheque_date
    bankName: varchar('bank_name', { length: 300 }), // old: cheque_bank
    chequeImagePath: varchar('cheque_image_path', { length: 500 }), // old: cheq_img
    cancelledImagePath: varchar('cancelled_image_path', { length: 500 }), // old: cancelled_img
}, (t) => [{ fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }]);

// Bank Transfer / Portal Payment / UPI
export const instrumentTransferDetails = pgTable('instrument_transfer_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    portalName: varchar('portal_name', { length: 200 }), // old: portal (pay_on_portals.portal)
    accountName: varchar('account_name', { length: 500 }), // old: bt_acc_name
    accountNumber: varchar('account_number', { length: 50 }), // old: bt_acc
    ifsc: varchar('ifsc', { length: 20 }), // old: bt_ifsc
    transactionId: varchar('transaction_id', { length: 500 }), // old: utr, utr_num
    transactionDate: timestamp('transaction_date'), // old: date_time

    // Extra from portal payments
    paymentMethod: varchar('payment_method', { length: 50 }), // old: is_netbanking, is_debit → derive: Netbanking, Debit Card, etc.
}, (t) => [{ fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }]);

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
