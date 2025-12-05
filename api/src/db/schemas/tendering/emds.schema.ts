import { pgTable, varchar, text, decimal, timestamp, date, pgEnum, serial, index, foreignKey, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';

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
    'DD',
    'FDR',
    'BG',
    'Cheque',
    'Bank Transfer',
    'Portal Payment',
    'Surety Bond',
]);

export const paymentRequestTypeEnum = pgEnum('payment_request_type', [
    'TMS', 'Other Than TMS', 'Old Entries', 'Other Than Tender'
]);

// ============================================
// PAYMENT REQUESTS TABLE
// ============================================
export const paymentRequests = pgTable('payment_requests', {
    id: serial('id').primaryKey(),
    tenderId: integer('tender_id').notNull(),

    type: paymentRequestTypeEnum('type').default('TMS'),
    tenderNo: varchar('tender_no', { length: 500 }).default('NA'),
    projectName: varchar('project_name', { length: 500 }),

    purpose: paymentPurposeEnum('purpose').notNull(),
    amountRequired: decimal('amount_required', { precision: 15, scale: 2 }).notNull(),
    dueDate: timestamp('due_date'),
    requestedBy: varchar('requested_by', { length: 200 }),

    status: varchar('status', { length: 50 }).default('Pending'),
    remarks: text('remarks'),

    legacyEmdId: integer('legacy_emd_id'),

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

// ============================================
// PAYMENT INSTRUMENTS TABLE
// ============================================
export const paymentInstruments = pgTable('payment_instruments', {
    id: serial('id').primaryKey(),
    requestId: integer('request_id').notNull(),

    instrumentType: instrumentTypeEnum('instrument_type').notNull(),

    // Common fields
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
    favouring: varchar('favouring', { length: 500 }),
    payableAt: varchar('payable_at', { length: 500 }),

    issueDate: date('issue_date'),
    expiryDate: date('expiry_date'),
    validityDate: date('validity_date'),
    claimExpiryDate: date('claim_expiry_date'),

    utr: varchar('utr', { length: 255 }),
    docketNo: varchar('docket_no', { length: 255 }),
    courierAddress: text('courier_address'),

    action: integer('action').default(0),
    status: varchar('status', { length: 100 }).default('ACCOUNTS_FORM_PENDING').notNull(),
    currentStage: integer('current_stage').default(1),
    isActive: boolean('is_active').default(true),
    courierDeadline: integer('courier_deadline'),

    rejectionReason: text('rejection_reason'),

    // File paths
    generatedPdf: varchar('generated_pdf', { length: 500 }),
    cancelPdf: varchar('cancel_pdf', { length: 500 }),
    docketSlip: varchar('docket_slip', { length: 500 }),
    coveringLetter: varchar('covering_letter', { length: 500 }),
    extraPdfPaths: text('extra_pdf_paths'),

    extensionRequestPdf: varchar('extension_request_pdf', { length: 500 }),
    cancellationRequestPdf: varchar('cancellation_request_pdf', { length: 500 }),

    // Additional common fields
    reqNo: varchar('req_no', { length: 200 }),
    reqReceive: varchar('req_receive', { length: 500 }),
    referenceNo: varchar('reference_no', { length: 200 }),
    transferDate: date('transfer_date'),
    creditDate: date('credit_date'),
    creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }),
    remarks: text('remarks'),

    // Legacy IDs for traceability
    legacyDdId: integer('legacy_dd_id'),
    legacyFdrId: integer('legacy_fdr_id'),
    legacyBgId: integer('legacy_bg_id'),
    legacyChequeId: integer('legacy_cheque_id'),
    legacyBtId: integer('legacy_bt_id'),
    legacyPortalId: integer('legacy_portal_id'),

    // Legacy data storage for unmapped fields
    legacyData: jsonb('legacy_data'),

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
        { legacyDdIdx: index('instruments_legacy_dd_id_idx').on(table.legacyDdId) },
        { legacyFdrIdx: index('instruments_legacy_fdr_id_idx').on(table.legacyFdrId) },
        { legacyBgIdx: index('instruments_legacy_bg_id_idx').on(table.legacyBgId) },
        { legacyChequeIdx: index('instruments_legacy_cheque_id_idx').on(table.legacyChequeId) },
        { legacyBtIdx: index('instruments_legacy_bt_id_idx').on(table.legacyBtId) },
        { legacyPortalIdx: index('instruments_legacy_portal_id_idx').on(table.legacyPortalId) },
    ];
});

// ============================================
// DD - DEMAND DRAFT DETAILS
// ============================================
export const instrumentDdDetails = pgTable('instrument_dd_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),

    ddNo: varchar('dd_no', { length: 100 }),
    ddDate: date('dd_date'),
    bankName: varchar('bank_name', { length: 300 }),
    reqNo: varchar('req_no', { length: 100 }),

    ddNeeds: varchar('dd_needs', { length: 255 }),
    ddPurpose: varchar('dd_purpose', { length: 255 }),
    ddRemarks: text('dd_remarks'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// FDR - FIXED DEPOSIT RECEIPT DETAILS
// ============================================
export const instrumentFdrDetails = pgTable('instrument_fdr_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),

    fdrNo: varchar('fdr_no', { length: 100 }),
    fdrDate: date('fdr_date'),
    fdrSource: varchar('fdr_source', { length: 200 }),
    roi: decimal('roi', { precision: 15, scale: 2 }),
    marginPercent: decimal('margin_percent', { precision: 15, scale: 2 }),
    fdrPurpose: varchar('fdr_purpose', { length: 500 }),
    fdrExpiryDate: date('fdr_expiry_date'),

    fdrNeeds: varchar('fdr_needs', { length: 255 }),
    fdrRemark: text('fdr_remark'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// BG - BANK GUARANTEE DETAILS
// ============================================
export const instrumentBgDetails = pgTable('instrument_bg_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),

    bgNo: varchar('bg_no', { length: 100 }),
    bgDate: date('bg_date'),
    validityDate: date('validity_date'),
    claimExpiryDate: date('claim_expiry_date'),
    beneficiaryName: varchar('beneficiary_name', { length: 500 }),
    beneficiaryAddress: text('beneficiary_address'),
    bankName: varchar('bank_name', { length: 300 }),

    // Margin percentages
    cashMarginPercent: decimal('cash_margin_percent', { precision: 15, scale: 2 }),
    fdrMarginPercent: decimal('fdr_margin_percent', { precision: 15, scale: 2 }),

    // Charges
    stampCharges: decimal('stamp_charges', { precision: 15, scale: 2 }),
    sfmsCharges: decimal('sfms_charges', { precision: 15, scale: 2 }),

    // Deducted charges
    stampChargesDeducted: decimal('stamp_charges_deducted', { precision: 15, scale: 2 }),
    sfmsChargesDeducted: decimal('sfms_charges_deducted', { precision: 15, scale: 2 }),
    otherChargesDeducted: decimal('other_charges_deducted', { precision: 15, scale: 2 }),

    // Extension fields
    extendedAmount: decimal('extended_amount', { precision: 15, scale: 2 }),
    extendedValidityDate: date('extended_validity_date'),
    extendedClaimExpiryDate: date('extended_claim_expiry_date'),
    extendedBankName: varchar('extended_bank_name', { length: 300 }),

    // File paths
    extensionLetterPath: varchar('extension_letter_path', { length: 500 }),
    cancellationLetterPath: varchar('cancellation_letter_path', { length: 500 }),
    prefilledSignedBg: text('prefilled_signed_bg'),

    // BG Basic Info
    bgNeeds: varchar('bg_needs', { length: 255 }),
    bgPurpose: varchar('bg_purpose', { length: 255 }),
    bgSoftCopy: varchar('bg_soft_copy', { length: 255 }),
    bgPo: varchar('bg_po', { length: 255 }),

    // Client Info
    bgClientUser: varchar('bg_client_user', { length: 255 }),
    bgClientCp: varchar('bg_client_cp', { length: 255 }),
    bgClientFin: varchar('bg_client_fin', { length: 255 }),

    // Bank Account Details
    bgBankAcc: varchar('bg_bank_acc', { length: 255 }),
    bgBankIfsc: varchar('bg_bank_ifsc', { length: 255 }),

    // Courier
    courierNo: varchar('courier_no', { length: 255 }),

    // BG Formats
    approveBg: varchar('approve_bg', { length: 255 }),
    bgFormatTe: varchar('bg_format_te', { length: 255 }),
    bgFormatTl: varchar('bg_format_tl', { length: 255 }),

    // SFMS
    sfmsConf: varchar('sfms_conf', { length: 255 }),

    // FDR Details (for BG)
    fdrAmt: decimal('fdr_amt', { precision: 15, scale: 2 }),
    fdrPer: decimal('fdr_per', { precision: 15, scale: 2 }),
    fdrCopy: varchar('fdr_copy', { length: 255 }),
    fdrNo: varchar('fdr_no', { length: 255 }),
    fdrValidity: date('fdr_validity'),
    fdrRoi: decimal('fdr_roi', { precision: 15, scale: 2 }),

    // BG Charges
    bgChargeDeducted: decimal('bg_charge_deducted', { precision: 15, scale: 2 }),
    newStampChargeDeducted: decimal('new_stamp_charge_deducted', { precision: 15, scale: 2 }),

    // Cancellation Details
    stampCoveringLetter: varchar('stamp_covering_letter', { length: 255 }),
    cancelRemark: text('cancel_remark'),
    cancellConfirm: text('cancell_confirm'),

    // FDR Cancellation Details
    bgFdrCancelDate: varchar('bg_fdr_cancel_date', { length: 255 }),
    bgFdrCancelAmount: decimal('bg_fdr_cancel_amount', { precision: 15, scale: 2 }),
    bgFdrCancelRefNo: varchar('bg_fdr_cancel_ref_no', { length: 255 }),

    // Remarks
    bg2Remark: text('bg2_remark'),
    reasonReq: text('reason_req'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// CHEQUE DETAILS
// ============================================
export const instrumentChequeDetails = pgTable('instrument_cheque_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),

    chequeNo: varchar('cheque_no', { length: 50 }),
    chequeDate: date('cheque_date'),
    bankName: varchar('bank_name', { length: 300 }),
    chequeImagePath: varchar('cheque_image_path', { length: 500 }),
    cancelledImagePath: varchar('cancelled_image_path', { length: 500 }),

    // Linked references
    linkedDdId: integer('linked_dd_id'),
    linkedFdrId: integer('linked_fdr_id'),

    // Request details
    reqType: varchar('req_type', { length: 255 }),
    chequeNeeds: varchar('cheque_needs', { length: 255 }),
    chequeReason: varchar('cheque_reason', { length: 255 }),

    // Dates
    dueDate: date('due_date'),
    transferDate: date('transfer_date'),
    btTransferDate: date('bt_transfer_date'),

    // Other details
    handover: varchar('handover', { length: 200 }),
    confirmation: varchar('confirmation', { length: 200 }),
    reference: varchar('reference', { length: 200 }),
    stopReasonText: text('stop_reason_text'),

    // Amount (for action 3)
    amount: decimal('amount', { precision: 15, scale: 2 }),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// BANK TRANSFER / PORTAL PAYMENT DETAILS
// ============================================
export const instrumentTransferDetails = pgTable('instrument_transfer_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),

    portalName: varchar('portal_name', { length: 200 }),
    accountName: varchar('account_name', { length: 500 }),
    accountNumber: varchar('account_number', { length: 50 }),
    ifsc: varchar('ifsc', { length: 20 }),
    transactionId: varchar('transaction_id', { length: 500 }),
    transactionDate: timestamp('transaction_date'),
    paymentMethod: varchar('payment_method', { length: 50 }),

    // Bank Transfer specific
    utrMsg: text('utr_msg'),
    utrNum: varchar('utr_num', { length: 200 }),

    // Portal Payment specific
    isNetbanking: varchar('is_netbanking', { length: 255 }),
    isDebit: varchar('is_debit', { length: 255 }),

    // Return details
    returnTransferDate: date('return_transfer_date'),
    returnUtr: varchar('return_utr', { length: 200 }),

    // Rejection/Remarks
    reason: text('reason'),
    remarks: text('remarks'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// INSTRUMENT STATUS HISTORY
// ============================================
export const instrumentStatusHistory = pgTable('instrument_status_history', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(),
    fromStatus: varchar('from_status', { length: 100 }).notNull(),
    toStatus: varchar('to_status', { length: 100 }).notNull(),
    fromAction: integer('from_action').notNull(),
    toAction: integer('to_action').notNull(),
    fromStage: integer('from_stage').notNull(),
    toStage: integer('to_stage').notNull(),
    formData: jsonb('form_data'),
    remarks: text('remarks'),
    rejectionReason: text('rejection_reason'),
    isResubmission: boolean('is_resubmission').notNull().default(false),
    previousInstrumentId: integer('previous_instrument_id'),
    changedBy: integer('changed_by').notNull(),
    changedByName: varchar('changed_by_name', { length: 200 }).notNull(),
    changedByRole: varchar('changed_by_role', { length: 200 }).notNull(),
    ipAddress: varchar('ip_address', { length: 200 }).notNull(),
    userAgent: varchar('user_agent', { length: 200 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    { fkInstrument: foreignKey({ columns: [t.instrumentId], foreignColumns: [paymentInstruments.id] }).onDelete('cascade') }
]);

// ============================================
// TYPES
// ============================================
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type PaymentInstrument = typeof paymentInstruments.$inferSelect;
export type InstrumentDdDetails = typeof instrumentDdDetails.$inferSelect;
export type InstrumentFdrDetails = typeof instrumentFdrDetails.$inferSelect;
export type InstrumentBgDetails = typeof instrumentBgDetails.$inferSelect;
export type InstrumentChequeDetails = typeof instrumentChequeDetails.$inferSelect;
export type InstrumentTransferDetails = typeof instrumentTransferDetails.$inferSelect;
export type InstrumentStatusHistory = typeof instrumentStatusHistory.$inferSelect;

export type NewPaymentRequest = typeof paymentRequests.$inferInsert;
export type NewPaymentInstrument = typeof paymentInstruments.$inferInsert;
export type NewInstrumentDdDetails = typeof instrumentDdDetails.$inferInsert;
export type NewInstrumentFdrDetails = typeof instrumentFdrDetails.$inferInsert;
export type NewInstrumentBgDetails = typeof instrumentBgDetails.$inferInsert;
export type NewInstrumentChequeDetails = typeof instrumentChequeDetails.$inferInsert;
export type NewInstrumentTransferDetails = typeof instrumentTransferDetails.$inferInsert;
export type NewInstrumentStatusHistory = typeof instrumentStatusHistory.$inferInsert;
