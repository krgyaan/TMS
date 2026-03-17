import { bigserial } from "drizzle-orm/pg-core";
import { text, integer, index, pgTable, bigint, varchar, timestamp, numeric, date, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * WO Basic Details Table
 * =====================
 * Stores the initial project information filled by TE (Tendering Executive) within 12 hours of PO receipt.
 * This is the first step in the WO workflow and creates the project in the system.
 * Once filled, the project appears on Project Dashboard and triggers TL assignment workflow.
 */
export const woBasicDetails = pgTable("wo_basic_details", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    // Source reference - links to either a TMS tender or manual enquiry
    tenderId: bigint("tender_id", { mode: "number" }), // Reference to TMS tender (auto-fills data)
    enquiryId: bigint("enquiry_id", { mode: "number" }), // Reference to manual enquiry

    // Core WO information
    woNumber: varchar("wo_number", { length: 255 }), // Work Order number from client
    woDate: date("wo_date"), // Date when WO was issued
    projectCode: varchar("project_code", { length: 100 }).unique(), // Auto-generated unique project identifier
    projectName: varchar("project_name", { length: 255 }), // Auto-filled from tender name (TMS) or manual entry

    // Workflow state tracking
    currentStage: varchar("current_stage", { length: 50 }), // Enum: 'basic_details' | 'wo_details' | 'wo_acceptance' | 'wo_upload' | 'completed'

    // Financial details
    woValuePreGst: numeric("wo_value_pre_gst", { precision: 20, scale: 2 }), // WO value before GST
    woValueGstAmt: numeric("wo_value_gst_amt", { precision: 20, scale: 2 }), // GST amount
    receiptPreGst: numeric("receipt_pre_gst", { precision: 20, scale: 2 }), // Auto-filled from Pricing Module (TMS) or manual
    budgetPreGst: numeric("budget_pre_gst", { precision: 20, scale: 2 }), // Auto-filled from Pricing Module (TMS) or manual
    grossMargin: numeric("gross_margin", { precision: 5, scale: 2 }), // Calculated: ((Receipt-Budget)/Receipt) * 100

    // Document upload
    woDraft: varchar("wo_draft", { length: 255 }), // Upload LOA/GEM PO/LOI/Draft WO document path

    // Checklist and TMS Documents
    tmsDocuments: jsonb("tms_documents"), // Stores document completeness status as JSON

    // Operations Executive assignments (by TL within 12 hours of Basic Details)
    // Different OEs can be assigned different roles in the project
    oeFirst: bigint("oe_first", { mode: "number" }), // Primary Operations Executive assigned to project
    oeFirstAssignedAt: timestamp("oe_first_assigned_at", { withTimezone: true }), // Timestamp of assignment
    oeFirstAssignedBy: bigint("oe_first_assigned_by", { mode: "number" }), // TL who assigned (user_id)

    oeSiteVisit: bigint("oe_site_visit", { mode: "number" }), // OE assigned for site visit (approved/assigned by TL)
    oeSiteVisitAssignedAt: timestamp("oe_site_visit_assigned_at", { withTimezone: true }),
    oeSiteVisitAssignedBy: bigint("oe_site_visit_assigned_by", { mode: "number" }),

    oeDocsPrep: bigint("oe_docs_prep", { mode: "number" }), // OE assigned for document preparation for approval
    oeDocsPrepVisitAssignedAt: timestamp("oe_docs_prep_assigned_at", { withTimezone: true }),
    oeDocsPrepVisitAssignedBy: bigint("oe_docs_prep_assigned_by", { mode: "number" }),

    // Workflow control - TL can pause workflow during PO amendment process
    isWorkflowPaused: boolean("is_workflow_paused").default(false), // Paused when waiting for edited PO
    workflowPausedAt: timestamp("workflow_paused_at", { withTimezone: true }), // When workflow was paused
    workflowResumedAt: timestamp("workflow_resumed_at", { withTimezone: true }), // When edited PO uploaded and workflow resumed

    // Audit timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), // When TE created the basic details
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), // Last update timestamp
    createdBy: bigint("created_by", { mode: "number" }), // TE who created
    updatedBy: bigint("updated_by", { mode: "number" }),
});

/**
 * WO Details Table
 * ================
 * Stores detailed WO information and client contacts filled after Basic Details.
 * Includes contractual terms (LD, PBG, agreements) and triggers WO Acceptance workflow.
 * Email sent to TL and CEO with PSS and WO Dashboard Link once filled.
 */
export const woDetails = pgTable("wo_details", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woBasicDetailId: bigint("wo_basic_detail_id", { mode: "number" }).notNull()
        .references(() => woBasicDetails.id, { onDelete: "cascade" }),

    // PAGE 1: Project Handover
    tenderDocumentsChecklist: jsonb("tender_documents_checklist").$type<{
        completeTenderDocuments: boolean;
        tenderInfo: boolean;
        emdInformation: boolean;
        physicalDocumentsSubmission: boolean;
        rfqAndQuotation: boolean;
        documentChecklist: boolean;
        costingSheet: boolean;
        result: boolean;
    }>(),
    checklistCompletedAt: timestamp("checklist_completed_at", { withTimezone: true }),
    checklistIncompleteNotifiedAt: timestamp("checklist_incomplete_notified_at", { withTimezone: true }),

    // PAGE 2: Compliance Obligations
    ldApplicable: boolean("ld_applicable").default(false),
    maxLd: numeric("max_ld", { precision: 5, scale: 2 }),
    ldStartDate: date("ld_start_date"),
    maxLdDate: date("max_ld_date"),

    isPbgApplicable: boolean("is_pbg_applicable").default(false),
    filledBgFormat: varchar("filled_bg_format", { length: 255 }),
    pbgBgId: bigint("pbg_bg_id", { mode: "number" }),

    isContractAgreement: boolean("is_contract_agreement").default(false),
    contractAgreementFormat: varchar("contract_agreement_format", { length: 255 }),

    detailedPoApplicable: boolean("detailed_po_applicable").default(false),
    detailedPoFollowupId: bigint("detailed_po_followup_id", { mode: "number" }),

    // PAGE 3: SWOT Analysis
    swotStrengths: text("swot_strengths"),
    swotWeaknesses: text("swot_weaknesses"),
    swotOpportunities: text("swot_opportunities"),
    swotThreats: text("swot_threats"),
    swotCompletedAt: timestamp("swot_completed_at", { withTimezone: true }),

    // PAGE 4: Billing (BOQ in separate tables)
    // References: woBillingBoq, woBuybackBoq, woBillingAddresses, woShippingAddresses

    // PAGE 5: Project Execution
    siteVisitNeeded: boolean("site_visit_needed").default(false),
    siteVisitPersonName: varchar("site_visit_person_name", { length: 255 }),
    siteVisitPersonPhone: varchar("site_visit_person_phone", { length: 20 }),
    siteVisitPersonEmail: varchar("site_visit_person_email", { length: 255 }),
    siteVisitApproved: boolean("site_visit_approved"),
    siteVisitApprovedBy: bigint("site_visit_approved_by", { mode: "number" }),
    siteVisitApprovedAt: timestamp("site_visit_approved_at", { withTimezone: true }),

    // PAGE 6: Profitability
    costingSheetLink: varchar("costing_sheet_link", { length: 500 }),
    hasDiscrepancies: boolean("has_discrepancies").default(false),
    discrepancyComments: text("discrepancy_comments"),
    discrepancyNotifiedAt: timestamp("discrepancy_notified_at", { withTimezone: true }),

    budgetPreGst: numeric("budget_pre_gst", { precision: 20, scale: 2 }),
    budgetSupply: numeric("budget_supply", { precision: 20, scale: 2 }),
    budgetService: numeric("budget_service", { precision: 20, scale: 2 }),
    budgetFreight: numeric("budget_freight", { precision: 20, scale: 2 }),
    budgetAdmin: numeric("budget_admin", { precision: 20, scale: 2 }),
    budgetBuybackSale: numeric("budget_buyback_sale", { precision: 20, scale: 2 }),

    // ===========================================
    // Wizard Progress (OE's 6 pages)
    // ===========================================
    currentPage: integer("current_page").default(1),
    completedPages: jsonb("completed_pages").$type<number[]>().default([]),
    skippedPages: jsonb("skipped_pages").$type<number[]>().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }), // 96 hours
    completedAt: timestamp("completed_at", { withTimezone: true }),
    isOverdue: boolean("is_overdue").default(false),

    // ===========================================
    // OE Workflow Status
    // ===========================================
    status: varchar("status", { length: 50 }).default('draft'),
    // Enum: 'draft' | 'in_progress' | 'completed' | 'submitted_for_review'

    // ===========================================
    // Audit
    // ===========================================
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }), // OE
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => ({
    basicIdx: index("idx_wo_details_basic_detail").on(table.woBasicDetailId),
    statusIdx: index("idx_wo_details_status").on(table.status),
}));

// ============================================
// WO Acceptance Table (TL Workflow)
// ============================================
/**
 * WO Acceptance Table
 * ====================
 * Separate workflow for Team Leader (TL) to review and accept/reject WO.
 * Created automatically when OE completes all pages (or manually by TL).
 *
 * TL Workflow:
 * 1. TL reviews PSS (Project Summary Sheet) and WO Dashboard
 * 2. TL has 24hrs to raise queries to TE/OE
 * 3. TE/OE has 24hrs to respond
 * 4. TL has 12hrs for final decision (Accept or Request Amendment)
 *
 * If Accepted:
 * - OE puts digital signature on WO
 * - TL puts digital signature on WO
 * - Authority letter generated
 * - Courier request initiated (dormant until TL accepts)
 *
 * If Amendment Needed:
 * - Amendments recorded in woAmendments table
 * - Followup initiated with client
 * - Workflow paused until amended WO received
 */
export const woAcceptance = pgTable("wo_acceptance", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull().unique()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    tlId: bigint("tl_id", { mode: "number" }).notNull(), // Team Leader assigned for review
    tlAssignedAt: timestamp("tl_assigned_at", { withTimezone: true }).notNull().defaultNow(),
    tlAssignedBy: bigint("tl_assigned_by", { mode: "number" }), // Who assigned (could be auto or manual)

    queryRaisedAt: timestamp("query_raised_at", { withTimezone: true }), // When TL raised queries
    queryRespondedAt: timestamp("query_responded_at", { withTimezone: true }), // When TE/OE responded
    finalDecisionAt: timestamp("final_decision_at", { withTimezone: true }), // When TL made decision
    decision: varchar("decision", { length: 50 }),
    // Enum: 'pending' | 'queries_raised' | 'accepted' | 'amendment_needed' | 'rejected'
    decisionRemarks: text("decision_remarks"), // TL's remarks on decision

    // Amendment Flow (if decision = 'amendment_needed')
    followupId: bigint("followup_id", { mode: "number" }), // FK to Followup Dashboard
    followupInitiatedAt: timestamp("followup_initiated_at", { withTimezone: true }),

    // Amended WO received
    amendedWoReceivedAt: timestamp("amended_wo_received_at", { withTimezone: true }),
    amendedWoFilePath: varchar("amended_wo_file_path", { length: 500 }),

    // Re-review after amendment
    reReviewCount: integer("re_review_count").default(0), // How many times re-reviewed

    // Acceptance Flow (if decision = 'accepted')
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    // Digital Signatures
    oeSignatureRequired: boolean("oe_signature_required").default(true),
    oeSignedAt: timestamp("oe_signed_at", { withTimezone: true }),
    oeSignedBy: bigint("oe_signed_by", { mode: "number" }),
    oeSignatureFilePath: varchar("oe_signature_file_path", { length: 500 }),

    tlSignatureRequired: boolean("tl_signature_required").default(true),
    tlSignedAt: timestamp("tl_signed_at", { withTimezone: true }),
    tlSignedBy: bigint("tl_signed_by", { mode: "number" }),
    tlSignatureFilePath: varchar("tl_signature_file_path", { length: 500 }),

    // Authority Letter (auto-generated)
    authorityLetterGenerated: boolean("authority_letter_generated").default(false),
    authorityLetterPath: varchar("authority_letter_path", { length: 500 }),
    authorityLetterGeneratedAt: timestamp("authority_letter_generated_at", { withTimezone: true }),

    // Final Signed WO
    signedWoFilePath: varchar("signed_wo_file_path", { length: 500 }),
    signedWoUploadedAt: timestamp("signed_wo_uploaded_at", { withTimezone: true }),
    signedWoUploadedBy: bigint("signed_wo_uploaded_by", { mode: "number" }),

    // Courier Flow
    courierRequired: boolean("courier_required").default(true),
    courierId: bigint("courier_id", { mode: "number" }), // FK to Courier table
    courierRequestCreatedAt: timestamp("courier_request_created_at", { withTimezone: true }),
    courierRequestCreatedBy: bigint("courier_request_created_by", { mode: "number" }),

    // Workflow Status
    status: varchar("status", { length: 50 }).default('pending_review'),
    // Enum: 'pending_review' | 'in_review' | 'queries_pending' | 'awaiting_amendment' |
    //       'pending_signatures' | 'pending_courier' | 'completed'

    isCompleted: boolean("is_completed").default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }),
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => ({
    woDetailIdx: index("idx_wo_acceptance_wo_detail").on(table.woDetailId),
    tlIdx: index("idx_wo_acceptance_tl").on(table.tlId),
    statusIdx: index("idx_wo_acceptance_status").on(table.status),
    decisionIdx: index("idx_wo_acceptance_decision").on(table.decision),
}));

// ============================================
// WO Amendments Table (Updated - references woAcceptance)
// ============================================
export const woAmendments = pgTable("wo_amendments", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woAcceptanceId: bigint("wo_acceptance_id", { mode: "number" }).notNull()
        .references(() => woAcceptance.id, { onDelete: "cascade" }), // Changed from woDetailId

    // Amendment details
    pageNo: varchar("page_no", { length: 100 }),
    clauseNo: varchar("clause_no", { length: 100 }),
    currentStatement: text("current_statement"),
    correctedStatement: text("corrected_statement"),

    // Amendment status tracking
    status: varchar("status", { length: 50 }).default('pending'),
    // Enum: 'pending' | 'communicated' | 'client_acknowledged' | 'resolved' | 'rejected_by_client'

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    clientResponse: text("client_response"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }), // TL who created
}, (table) => ({
    woAcceptanceIdx: index("idx_wo_amendments_acceptance").on(table.woAcceptanceId),
    statusIdx: index("idx_wo_amendments_status").on(table.status),
}));

// ============================================
// WO Queries Table (Updated - references woAcceptance)
// ============================================
export const woQueries = pgTable("wo_queries", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woAcceptanceId: bigint("wo_acceptance_id", { mode: "number" }).notNull()
        .references(() => woAcceptance.id, { onDelete: "cascade" }), // Changed from woDetailId

    // Query metadata
    queryBy: bigint("query_by", { mode: "number" }).notNull(), // TL user ID
    queryTo: varchar("query_to", { length: 50 }).notNull(), // 'TE' | 'OE' | 'BOTH'
    queryToUserIds: jsonb("query_to_user_ids").$type<number[]>(), // Actual user IDs
    queryText: text("query_text").notNull(),
    queryRaisedAt: timestamp("query_raised_at", { withTimezone: true }).notNull().defaultNow(),

    // Response tracking
    responseText: text("response_text"),
    respondedBy: bigint("responded_by", { mode: "number" }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),

    // Deadline tracking
    responseDeadlineAt: timestamp("response_deadline_at", { withTimezone: true }), // 24 hrs from query
    isOverdue: boolean("is_overdue").default(false),

    // Query lifecycle
    status: varchar("status", { length: 50 }).default('pending'),
    // Enum: 'pending' | 'responded' | 'closed' | 'escalated'

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    woAcceptanceIdx: index("idx_wo_queries_acceptance").on(table.woAcceptanceId),
    statusIdx: index("idx_wo_queries_status").on(table.status),
    queryByIdx: index("idx_wo_queries_by").on(table.queryBy),
}));

/**
 * WO Documents Table
 * ==================
 * Stores all WO-related documents with version control.
 * Upload sequence: Draft WO → Accepted & Signed WO → Detailed/SAP PO (if applicable)
 * Detailed WO upload only if isDetailedWoApplicable = true in workflow.
 */
export const woDocuments = pgTable("wo_documents", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  woDetailId: bigint("wo_detail_id", { mode: "number" }), // FK to woDetails

  // Document type and versioning
  type: varchar("type", { length: 50 }), // Enum: 'draftWo' | 'acceptedWoSigned' | 'finalWo' | 'detailedWo' | 'sapPo' | 'foa'
  version: integer("version"), // Version number (for tracking amendments)
  filePath: varchar("file_path", { length: 500 }), // Storage path of uploaded document

  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  uploadedBy: bigint("uploaded_by", { mode: "number" }), // Who uploaded
});

/**
 * WO Contacts Table
 * =================
 * Stores client contact information across different departments.
 * Used for followups, amendments, and communication.
 * Multiple contacts can exist per WO (EIC, User, C&P, Finance departments).
 * Shows old contacts + Add button for new contacts.
 */
export const woContacts = pgTable("wo_contacts", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woBasicDetailId: bigint("wo_basic_detail_id", { mode: "number" }), // FK to woBasicDetails

    // Client organization details
    organization: varchar("organization", { length: 100 }), // Auto-filled for TMS tenders
    departments: varchar("departments", { length: 20 }), // Dropdown: 'EIC' | 'User' | 'C&P' | 'Finance'

    // Contact person details
    name: varchar("name", { length: 255 }), // Contact person name
    designation: varchar("designation", { length: 50 }), // Their designation/title
    phone: varchar("phone", { length: 20 }), // Contact phone number
    email: varchar("email", { length: 255 }), // Contact email (used for followups)
});

// ============================================
// WO Billing BOQ Table
// ============================================
export const woBillingBoq = pgTable("wo_billing_boq", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNos: jsonb("sr_nos").$type<number[] | 'all'>().notNull(),

    itemDescription: text("item_description").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }), // Calculated: quantity * rate

    sortOrder: integer("sort_order"), // For drag-drop reordering

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_billing_boq_wo_detail").on(table.woDetailId),
    index("idx_billing_boq_sort_order").on(table.sortOrder),
]);

// ============================================
// WO Buyback BOQ Table
// ============================================
export const woBuybackBoq = pgTable("wo_buyback_boq", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNos: jsonb("sr_nos").$type<number[] | 'all'>().notNull(),
    itemDescription: text("item_description").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }),

    sortOrder: integer("sort_order"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_buyback_boq_wo_detail").on(table.woDetailId),
]);

// ============================================
// WO Billing Addresses Table
// ============================================
export const woBillingAddresses = pgTable("wo_billing_addresses", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNos: jsonb("sr_nos").$type<number[] | 'all'>().notNull(), // Array of SR nos or 'all'
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    gst: varchar("gst", { length: 15 }), // GST number format: 15 chars

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    woDetailIdx: index("idx_billing_addr_wo_detail").on(table.woDetailId),
}));

// ============================================
// WO Shipping Addresses Table
// ============================================
export const woShippingAddresses = pgTable("wo_shipping_addresses", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNos: jsonb("sr_nos").$type<number[] | 'all'>().notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    gst: varchar("gst", { length: 15 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    woDetailIdx: index("idx_shipping_addr_wo_detail").on(table.woDetailId),
}));

// ============================================
// WO Document Approvals Table (Page 5)
// ============================================
export const woDocumentApprovals = pgTable("wo_document_approvals", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    documentName: varchar("document_name", { length: 255 }).notNull(),
    documentType: varchar("document_type", { length: 50 }).notNull(),
    // Enum: 'available' | 'needed' | 'in_house'

    filePath: varchar("file_path", { length: 500 }),
    status: varchar("status", { length: 50 }).default('pending'),
    // Enum: 'pending' | 'uploaded' | 'approved' | 'rejected'

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    woDetailIdx: index("idx_doc_approvals_wo_detail").on(table.woDetailId),
    typeIdx: index("idx_doc_approvals_type").on(table.documentType),
}));

// ============================================
// Type Exports
// ============================================
export type WoBillingBoq = typeof woBillingBoq.$inferSelect;
export type NewWoBillingBoq = typeof woBillingBoq.$inferInsert;

export type WoBuybackBoq = typeof woBuybackBoq.$inferSelect;
export type NewWoBuybackBoq = typeof woBuybackBoq.$inferInsert;

export type WoBillingAddress = typeof woBillingAddresses.$inferSelect;
export type NewWoBillingAddress = typeof woBillingAddresses.$inferInsert;

export type WoShippingAddress = typeof woShippingAddresses.$inferSelect;
export type NewWoShippingAddress = typeof woShippingAddresses.$inferInsert;

export type WoDocumentApproval = typeof woDocumentApprovals.$inferSelect;
export type NewWoDocumentApproval = typeof woDocumentApprovals.$inferInsert;

export type WoBasicDetails = typeof woBasicDetails.$inferSelect;
export type NewWoBasicDetails = typeof woBasicDetails.$inferInsert;

export type WoDetail = typeof woDetails.$inferSelect;
export type NewWoDetail = typeof woDetails.$inferInsert;

export type WoContact = typeof woContacts.$inferSelect;
export type NewWoContact = typeof woContacts.$inferInsert;

export type WoDocument = typeof woDocuments.$inferSelect;
export type NewWoDocument = typeof woDocuments.$inferInsert;

export type WoAcceptance = typeof woAcceptance.$inferSelect;
export type NewWoAcceptance = typeof woAcceptance.$inferInsert;

export type WoAmendment = typeof woAmendments.$inferSelect;
export type NewWoAmendment = typeof woAmendments.$inferInsert;

export type WoQuery = typeof woQueries.$inferSelect;
export type NewWoQuery = typeof woQueries.$inferInsert;
