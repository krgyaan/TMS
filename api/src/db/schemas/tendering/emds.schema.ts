import { pgTable, varchar, text, decimal, timestamp, date, pgEnum, serial, index, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

// Enums
export const paymentPurposeEnum = pgEnum('payment_purpose', [
    'EMD',               // Corresponds to MySQL emds.purpose = 'EMD'
    'Tender Fee',        // Corresponds to MySQL emds.purpose = 'Tender Fee'
    'Processing Fee',    // Corresponds to MySQL emds.purpose = 'Processing Fee'
    'Security Deposit',  // Corresponds to MySQL emds.purpose = 'Security Deposit'
    'Performance BG',    // Corresponds to MySQL emds.purpose = 'Performance BG'
    'Surety Bond',       // Corresponds to MySQL emds.purpose = 'Surety Bond'
    'Other Payment',     // Corresponds to MySQL emds.purpose = 'Other Payment'
]);

export const instrumentTypeEnum = pgEnum('instrument_type', [
    'DD',            // Corresponds to mysqlEmdDemandDrafts table
    'FDR',           // Corresponds to mysqlEmdFdrs table
    'BG',            // Corresponds to mysqlEmdBgs table
    'Cheque',        // Corresponds to mysqlEmdCheques table
    'Bank Transfer', // Corresponds to mysqlBankTransfers table
    'Portal Payment',// Corresponds to mysqlPayOnPortals table
    'Surety Bond',
]);

export const paymentRequestTypeEnum = pgEnum('payment_request_type', [
    'TMS',
    'Other Than TMS',
    'Old Entries',
    'Other Than Tender'
]);

// ============================================
// PAYMENT REQUESTS TABLE
// Replaces MySQL 'emds' table
// ============================================
export const paymentRequests = pgTable('payment_requests', {
    id: serial('id').primaryKey(),

    // Direct mappings from MySQL emds table
    tenderId: integer('tender_id').notNull().default(0), // emds.tender_id
    type: paymentRequestTypeEnum('type').default('TMS'), // emds.type
    tenderNo: varchar('tender_no', { length: 500 }).default('NA'), // emds.tender_no (equal to tender.tenderNo)
    projectName: varchar('project_name', { length: 500 }), // emds.project_name (equal to tender.tenderName)
    dueDate: timestamp('due_date'), // emds.due_date (equal to tender.dueDate)
    requestedBy: varchar('requested_by', { length: 200 }), // emds.requested_by (equal to user.name)

    // New fields with MySQL equivalents
    purpose: paymentPurposeEnum('purpose').notNull(), // Replaces emds.purpose with more specific values
    amountRequired: decimal('amount_required', { precision: 15, scale: 2 }).notNull(), // Replaces emd_*.*_amt fields
    status: varchar('status', { length: 50 }).default('Pending'), // Replaces emds_*.status fields or emd_bgs.bg_req
    remarks: text('remarks'), // Replaces emd_bgs.reason_req, emd_cheques.reason, emd_fdrs.remarks, emd_demand_drafts.remarks, bank_transfers.reason, pay_on_portals.reason

    // For migration reference
    legacyEmdId: integer('legacy_emd_id'), // emds.id

    createdAt: timestamp('created_at').defaultNow(), // emds.created_at
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()), // emds.updated_at
}, (table) => {
    return [
        { purposeIdx: index('payment_requests_purpose_idx').on(table.purpose) },
        { legacyEmdIdx: index('payment_requests_legacy_emd_id_idx').on(table.legacyEmdId) },
    ];
});

// ============================================
// PAYMENT INSTRUMENTS TABLE
// Common table for all payment instruments
// ============================================
export const paymentInstruments = pgTable('payment_instruments', {
    id: serial('id').primaryKey(),
    requestId: integer('request_id').notNull(), // Links to payment_requests.id

    instrumentType: instrumentTypeEnum('instrument_type').notNull(),
    purpose: varchar('purpose', { length: 255 }),

    // Common fields with MySQL equivalents
    amount: decimal('amount', { precision: 15, scale: 2 }).notNull(), // emd_fdrs.fdr_amt, emd_demand_drafts.dd_amt, emd_bgs.bg_amt, emd_cheques.cheque_amt, bank_transfers.bt_amount, pay_on_portals.amount
    favouring: varchar('favouring', { length: 500 }), // emd_fdrs.fdr_favour, emd_demand_drafts.dd_favour, emd_bgs.bg_favour, emd_cheques.cheque_favour
    payableAt: varchar('payable_at', { length: 500 }), // emd_fdrs.fdr_payable, emd_demand_drafts.dd_payable

    issueDate: date('issue_date'), // emd_fdrs.fdr_date, emd_demand_drafts.dd_date, emd_bgs.bg_date, emd_cheques.cheque_date
    expiryDate: date('expiry_date'), // emd_fdrs.fdr_expiry, emd_bgs.bg_expiry
    validityDate: date('validity_date'), // emd_bgs.bg_validity
    claimExpiryDate: date('claim_expiry_date'), // emd_bgs.bg_claim

    utr: varchar('utr', { length: 255 }), // bank_transfers.utr, pay_on_portals.utr, emd_cheques.utr
    docketNo: varchar('docket_no', { length: 255 }), // emd_fdrs.docket_no, emd_demand_drafts.docket_no, emd_bgs.docket_no
    courierAddress: text('courier_address'), // emd_fdrs.courier_add, emd_bgs.bg_courier_addr
    courierDeadline: integer('courier_deadline'), // emd_fdrs.courier_deadline, emd_demand_drafts.courier_deadline, emd_bgs.bg_courier_deadline

    action: integer('action').default(0), // emd_fdrs.action, emd_demand_drafts.action, emd_bgs.action, emd_cheques.action
    status: varchar('status', { length: 100 }).default('ACCOUNTS_FORM_PENDING').notNull(),
    isActive: boolean('is_active').default(true),

    // File paths
    generatedPdf: varchar('generated_pdf', { length: 500 }), // emd_fdrs.generated_fdr, emd_demand_drafts.generated_dd, emd_cheques.generated_pdfs
    cancelPdf: varchar('cancel_pdf', { length: 500 }), // emd_fdrs.fdrcancel_pdf, emd_demand_drafts.ddcancel_pdf
    docketSlip: varchar('docket_slip', { length: 500 }), // emd_fdrs.docket_slip, emd_demand_drafts.docket_slip, emd_bgs.docket_slip
    coveringLetter: varchar('covering_letter', { length: 500 }), // emd_fdrs.covering_letter
    extraPdfPaths: text('extra_pdf_paths'),

    extensionRequestPdf: varchar('extension_request_pdf', { length: 500 }), // emd_bgs.request_extension_pdf
    cancellationRequestPdf: varchar('cancellation_request_pdf', { length: 500 }), // emd_bgs.request_cancellation_pdf

    // Additional common fields
    reqNo: varchar('req_no', { length: 200 }), // emd_fdrs.req_no, emd_demand_drafts.req_no, emd_bgs.req_no
    reqReceive: varchar('req_receive', { length: 500 }), // emd_fdrs.req_receive
    referenceNo: varchar('reference_no', { length: 200 }), // emd_fdrs.reference_no, emd_demand_drafts.reference_no, emd_bgs.reference_no, emd_cheques.reference
    transferDate: date('transfer_date'), // emd_fdrs.transfer_date, emd_demand_drafts.transfer_date, emd_cheques.transfer_date

    cancelledDate: date('cancelled_date'), // Maps to emd_fdrs.date, emd_demand_drafts.date
    amountCredited: decimal('amount_credited', { precision: 15, scale: 2 }), // Maps to emd_fdrs.amount, emd_demand_drafts.amount

    // Legacy IDs for traceability
    legacyDdId: integer('legacy_dd_id'), // emd_demand_drafts.id
    legacyFdrId: integer('legacy_fdr_id'), // emd_fdrs.id
    legacyBgId: integer('legacy_bg_id'), // emd_bgs.id
    legacyChequeId: integer('legacy_cheque_id'), // emd_cheques.id
    legacyBtId: integer('legacy_bt_id'), // bank_transfers.id
    legacyPortalId: integer('legacy_portal_id'), // pay_on_portals.id

    // Legacy data storage for unmapped fields
    legacyData: jsonb('legacy_data'), // For any fields not directly mapped

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (table) => {
    return [
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
// Replaces MySQL emd_demand_drafts table
// ============================================
export const instrumentDdDetails = pgTable('instrument_dd_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(), // Links to payment_instruments.id

    // Direct mappings from MySQL emd_demand_drafts
    ddNo: varchar('dd_no', { length: 100 }), // emd_demand_drafts.dd_no
    ddDate: date('dd_date'), // emd_demand_drafts.dd_date
    reqNo: varchar('req_no', { length: 100 }), // emd_demand_drafts.req_no
    ddNeeds: varchar('dd_needs', { length: 255 }), // emd_demand_drafts.dd_needs
    ddPurpose: varchar('dd_purpose', { length: 255 }), // emd_demand_drafts.dd_purpose
    ddRemarks: text('dd_remarks'), // emd_demand_drafts.remarks

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ============================================
// FDR - FIXED DEPOSIT RECEIPT DETAILS
// Replaces MySQL emd_fdrs table
// ============================================
export const instrumentFdrDetails = pgTable('instrument_fdr_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(), // Links to payment_instruments.id

    // Direct mappings from MySQL emd_fdrs
    fdrNo: varchar('fdr_no', { length: 100 }), // emd_fdrs.fdr_no
    fdrDate: date('fdr_date'), // emd_fdrs.fdr_date
    fdrSource: varchar('fdr_source', { length: 200 }), // emd_fdrs.fdr_source
    roi: decimal('roi', { precision: 15, scale: 2 }), // New field, not in MySQL but needed
    marginPercent: decimal('margin_percent', { precision: 15, scale: 2 }), // New field, not in MySQL but needed
    fdrPurpose: varchar('fdr_purpose', { length: 500 }), // New field, similar to emd_fdrs.fdr_needs
    fdrExpiryDate: date('fdr_expiry_date'), // emd_fdrs.fdr_expiry
    fdrNeeds: varchar('fdr_needs', { length: 255 }), // emd_fdrs.fdr_needs
    fdrRemark: text('fdr_remark'), // emd_fdrs.fdr_remark

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ============================================
// BG - BANK GUARANTEE DETAILS
// Replaces MySQL emd_bgs table
// ============================================
export const instrumentBgDetails = pgTable('instrument_bg_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(), // Links to payment_instruments.id

    // Direct mappings from MySQL emd_bgs
    bgNo: varchar('bg_no', { length: 100 }), // emd_bgs.bg_no
    bgDate: date('bg_date'), // emd_bgs.bg_date
    validityDate: date('validity_date'), // emd_bgs.bg_validity
    claimExpiryDate: date('claim_expiry_date'), // emd_bgs.claim_expiry
    beneficiaryName: varchar('beneficiary_name', { length: 500 }), // emd_bgs.bg_favour
    beneficiaryAddress: text('beneficiary_address'), // emd_bgs.bg_address
    bankName: varchar('bank_name', { length: 300 }), // emd_bgs.new_bg_bank_name

    // Margin percentages
    cashMarginPercent: decimal('cash_margin_percent', { precision: 15, scale: 2 }), // emd_bgs.bg_cont_percent
    fdrMarginPercent: decimal('fdr_margin_percent', { precision: 15, scale: 2 }), // emd_bgs.bg_fdr_percent

    // Charges
    stampCharges: decimal('stamp_charges', { precision: 15, scale: 2 }), // New field
    sfmsCharges: decimal('sfms_charges', { precision: 15, scale: 2 }), // New field

    // Deducted charges
    stampChargesDeducted: decimal('stamp_charges_deducted', { precision: 15, scale: 2 }), // emd_bgs.stamp_charge_deducted
    sfmsChargesDeducted: decimal('sfms_charges_deducted', { precision: 15, scale: 2 }), // emd_bgs.sfms_charge_deducted
    otherChargesDeducted: decimal('other_charges_deducted', { precision: 15, scale: 2 }), // emd_bgs.other_charge_deducted

    // Extension fields
    extendedAmount: decimal('extended_amount', { precision: 15, scale: 2 }), // emd_bgs.new_bg_amt
    extendedValidityDate: date('extended_validity_date'), // emd_bgs.new_bg_expiry
    extendedClaimExpiryDate: date('extended_claim_expiry_date'), // New field
    extendedBankName: varchar('extended_bank_name', { length: 300 }), // emd_bgs.new_bg_bank_name

    // File paths
    extensionLetterPath: varchar('extension_letter_path', { length: 500 }), // emd_bgs.request_extension_pdf
    cancellationLetterPath: varchar('cancellation_letter_path', { length: 500 }), // emd_bgs.request_cancellation_pdf
    prefilledSignedBg: text('prefilled_signed_bg'), // emd_bgs.prefilled_signed_bg

    // BG Basic Info
    bgNeeds: varchar('bg_needs', { length: 255 }), // emd_bgs.bg_needs
    bgPurpose: varchar('bg_purpose', { length: 255 }), // emd_bgs.bg_purpose
    bgSoftCopy: varchar('bg_soft_copy', { length: 255 }), // emd_bgs.bg_soft_copy
    bgPo: varchar('bg_po', { length: 255 }), // emd_bgs.bg_po

    // Client Info
    bgClientUser: varchar('bg_client_user', { length: 255 }), // emd_bgs.bg_client_user
    bgClientCp: varchar('bg_client_cp', { length: 255 }), // emd_bgs.bg_client_cp
    bgClientFin: varchar('bg_client_fin', { length: 255 }), // emd_bgs.bg_client_fin

    // Bank Account Details
    bgBankAcc: varchar('bg_bank_acc', { length: 255 }), // emd_bgs.bg_bank_acc
    bgBankIfsc: varchar('bg_bank_ifsc', { length: 255 }), // emd_bgs.bg_bank_ifsc

    // Courier
    courierNo: varchar('courier_no', { length: 255 }), // emd_bgs.courier_no

    // New fields
    stampCharge: decimal('stamp_charge', { precision: 15, scale: 2 }), // Maps to emd_bgs.bg_stamp
    extensionLetter: varchar('extension_letter', { length: 500 }), // Maps to emd_bgs.ext_letter
    newBgClaim: decimal('new_bg_claim', { precision: 15, scale: 2 }), // Maps to emd_bgs.new_bg_claim

    // BG Formats
    approveBg: varchar('approve_bg', { length: 255 }), // emd_bgs.approve_bg
    bgFormatTe: varchar('bg_format_te', { length: 255 }), // emd_bgs.bg_format_te
    bgFormatTl: varchar('bg_format_tl', { length: 255 }), // emd_bgs.bg_format_imran

    // SFMS
    sfmsConf: varchar('sfms_conf', { length: 255 }), // emd_bgs.sfms_conf

    // FDR Details (for BG)
    fdrAmt: decimal('fdr_amt', { precision: 15, scale: 2 }), // emd_bgs.fdr_amt
    fdrPer: decimal('fdr_per', { precision: 15, scale: 2 }), // emd_bgs.fdr_per
    fdrCopy: varchar('fdr_copy', { length: 255 }), // emd_bgs.fdr_copy
    fdrNo: varchar('fdr_no', { length: 255 }), // emd_bgs.fdr_no
    fdrValidity: date('fdr_validity'), // emd_bgs.fdr_validity
    fdrRoi: decimal('fdr_roi', { precision: 15, scale: 2 }), // emd_bgs.fdr_roi

    // BG Charges
    bgChargeDeducted: decimal('bg_charge_deducted', { precision: 15, scale: 2 }), // emd_bgs.bg_charge_deducted
    newStampChargeDeducted: decimal('new_stamp_charge_deducted', { precision: 15, scale: 2 }), // emd_bgs.new_stamp_charge_deducted

    // Cancellation Details
    stampCoveringLetter: varchar('stamp_covering_letter', { length: 255 }), // emd_bgs.stamp_covering_letter
    cancelRemark: text('cancel_remark'), // emd_bgs.cancel_remark
    cancellConfirm: text('cancell_confirm'), // emd_bgs.cancell_confirm

    // FDR Cancellation Details
    bgFdrCancelDate: varchar('bg_fdr_cancel_date', { length: 255 }), // emd_bgs.bg_fdr_cancel_date
    bgFdrCancelAmount: decimal('bg_fdr_cancel_amount', { precision: 15, scale: 2 }), // emd_bgs.bg_fdr_cancel_amount
    bgFdrCancelRefNo: varchar('bg_fdr_cancel_ref_no', { length: 255 }), // emd_bgs.bg_fdr_cancel_ref_no

    // Remarks
    bg2Remark: text('bg2_remark'), // emd_bgs.bg2_remark
    reasonReq: text('reason_req'), // emd_bgs.reason_req

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ============================================
// CHEQUE DETAILS
// Replaces MySQL emd_cheques table
// ============================================
export const instrumentChequeDetails = pgTable('instrument_cheque_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(), // Links to payment_instruments.id

    // Direct mappings from MySQL emd_cheques
    chequeNo: varchar('cheque_no', { length: 50 }), // emd_cheques.cheq_no
    chequeDate: date('cheque_date'), // emd_cheques.cheque_date
    bankName: varchar('bank_name', { length: 300 }), // emd_cheques.cheque_bank
    chequeImagePath: varchar('cheque_image_path', { length: 500 }), // emd_cheques.cheq_img
    cancelledImagePath: varchar('cancelled_image_path', { length: 500 }), // emd_cheques.cancelled_img

    // Linked references
    linkedDdId: integer('linked_dd_id'), // New field
    linkedFdrId: integer('linked_fdr_id'), // New field

    // Request details
    reqType: varchar('req_type', { length: 255 }), // emd_cheques.req_type
    chequeNeeds: varchar('cheque_needs', { length: 255 }), // emd_cheques.cheque_needs
    chequeReason: varchar('cheque_reason', { length: 255 }), // emd_cheques.cheque_reason

    // Dates
    dueDate: date('due_date'), // emd_cheques.duedate
    transferDate: date('transfer_date'), // emd_cheques.transfer_date
    btTransferDate: date('bt_transfer_date'), // emd_cheques.bt_transfer_date

    // Other details
    handover: varchar('handover', { length: 200 }), // emd_cheques.handover
    confirmation: varchar('confirmation', { length: 200 }), // emd_cheques.confirmation
    reference: varchar('reference', { length: 200 }), // emd_cheques.reference
    stopReasonText: text('stop_reason_text'), // emd_cheques.stop_reason_text

    // Amount (for action 3)
    amount: decimal('amount', { precision: 15, scale: 2 }), // emd_cheques.amount

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ============================================
// BANK TRANSFER / PORTAL PAYMENT DETAILS
// Replaces MySQL bank_transfers and pay_on_portals tables
// ============================================
export const instrumentTransferDetails = pgTable('instrument_transfer_details', {
    id: serial('id').primaryKey(),
    instrumentId: integer('instrument_id').notNull(), // Links to payment_instruments.id

    // Fields from both MySQL tables
    portalName: varchar('portal_name', { length: 200 }), // pay_on_portals.portal
    accountName: varchar('account_name', { length: 500 }), // bank_transfers.bt_acc_name
    accountNumber: varchar('account_number', { length: 50 }), // bank_transfers.bt_acc
    ifsc: varchar('ifsc', { length: 20 }), // bank_transfers.bt_ifsc
    transactionDate: timestamp('transaction_date'), // bank_transfers.date_time
    paymentMethod: varchar('payment_method', { length: 50 }), // New field to distinguish types

    // Bank Transfer specific
    utrMsg: text('utr_msg'), // bank_transfers.utr_mgs
    utrNum: varchar('utr_num', { length: 200 }), // bank_transfers.utr_num

    // Portal Payment specific
    isNetbanking: varchar('is_netbanking', { length: 255 }), // pay_on_portals.is_netbanking
    isDebit: varchar('is_debit', { length: 255 }), // pay_on_portals.is_debit

    // Return details
    returnTransferDate: date('return_transfer_date'), // New field
    returnUtr: varchar('return_utr', { length: 200 }), // New field

    // Rejection/Remarks
    reason: text('reason'), // bank_transfers.reason
    remarks: text('remarks'), // bank_transfers.remarks

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});

// ============================================
// INSTRUMENT STATUS HISTORY
// New table for tracking status changes
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
});

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
