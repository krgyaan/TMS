import { bigserial } from "drizzle-orm/pg-core";
import { text, integer, index, pgTable, bigint, varchar, timestamp, numeric, date, boolean, jsonb } from "drizzle-orm/pg-core";

// WO Basic Details - Initial project info filled by TE within 12 hours of PO receipt
export const woBasicDetails = pgTable("wo_basic_details", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    // Source reference
    tenderId: bigint("tender_id", { mode: "number" }),
    enquiryId: bigint("enquiry_id", { mode: "number" }),
    team: bigint("team", { mode: "number" }),

    // Core WO information
    woNumber: varchar("wo_number", { length: 255 }),
    woDate: date("wo_date"),
    projectCode: varchar("project_code", { length: 100 }).unique(),
    projectName: varchar("project_name", { length: 255 }),

    // Workflow state: 'basic_details' | 'wo_details' | 'wo_acceptance' | 'wo_upload' | 'completed'
    currentStage: varchar("current_stage", { length: 50 }),

    // Financial details
    woValuePreGst: numeric("wo_value_pre_gst", { precision: 20, scale: 2 }),
    woValueGstAmt: numeric("wo_value_gst_amt", { precision: 20, scale: 2 }),
    receiptPreGst: numeric("receipt_pre_gst", { precision: 20, scale: 2 }),
    budgetPreGst: numeric("budget_pre_gst", { precision: 20, scale: 2 }),
    grossMargin: numeric("gross_margin", { precision: 5, scale: 2 }),

    // Document upload
    woDraft: varchar("wo_draft", { length: 255 }),
    tmsDocuments: jsonb("tms_documents"),

    // OE assignments
    oeFirst: bigint("oe_first", { mode: "number" }),
    oeFirstAssignedAt: timestamp("oe_first_assigned_at", { withTimezone: true }),
    oeFirstAssignedBy: bigint("oe_first_assigned_by", { mode: "number" }),

    oeSiteVisit: bigint("oe_site_visit", { mode: "number" }),
    oeSiteVisitAssignedAt: timestamp("oe_site_visit_assigned_at", { withTimezone: true }),
    oeSiteVisitAssignedBy: bigint("oe_site_visit_assigned_by", { mode: "number" }),

    oeDocsPrep: bigint("oe_docs_prep", { mode: "number" }),
    oeDocsPrepAssignedAt: timestamp("oe_docs_prep_assigned_at", { withTimezone: true }),
    oeDocsPrepAssignedBy: bigint("oe_docs_prep_assigned_by", { mode: "number" }),

    // Workflow control
    isWorkflowPaused: boolean("is_workflow_paused").default(false),
    workflowPausedAt: timestamp("workflow_paused_at", { withTimezone: true }),
    workflowResumedAt: timestamp("workflow_resumed_at", { withTimezone: true }),

    // Status
    status: integer("status").default(0),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }),
    updatedBy: bigint("updated_by", { mode: "number" }),
});

// WO Details - Detailed WO info filled by OE (Pages 1-7)
export const woDetails = pgTable("wo_details", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woBasicDetailId: bigint("wo_basic_detail_id", { mode: "number" }).notNull()
        .references(() => woBasicDetails.id, { onDelete: "cascade" }),

    // PAGE 1: Project Handover - Tender Documents Checklist
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

    // PAGE 4: Billing - BOQ in separate tables

    // PAGE 5: Project Execution
    siteVisitNeeded: boolean("site_visit_needed").default(false),
    siteVisitPerson: jsonb("site_visit_person").$type<{ name: string; phone: string; email: string; }>(),
    documentsFromTendering: jsonb("documents_from_tendering").$type<string[]>(),
    documentsNeeded: jsonb("documents_needed").$type<string[]>(),
    documentsInHouse: jsonb("documents_in_house").$type<string[]>(),

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

    // PAGE 7: WO Acceptance (OE Step)
    oeWoAmendmentNeeded: boolean("oe_wo_amendment_needed"),
    oeAmendmentSubmittedAt: timestamp("oe_amendment_submitted_at", { withTimezone: true }),
    oeSignaturePrepared: boolean("oe_signature_prepared").default(false),
    courierRequestPrepared: boolean("courier_request_prepared").default(false),
    courierRequestPreparedAt: timestamp("courier_request_prepared_at", { withTimezone: true }),

    // Wizard Progress
    currentPage: integer("current_page").default(1),
    completedPages: jsonb("completed_pages").$type<number[]>().default([]),
    skippedPages: jsonb("skipped_pages").$type<number[]>().default([]),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Status: 'draft' | 'in_progress' | 'completed' | 'submitted_for_review'
    status: varchar("status", { length: 50 }).default('draft'),

    // VE Signed Contract Agreement
    veSigned: varchar("ve_signed", { length: 500 }),
    veSignedDate: date("ve_signed_date"),

    // Client and VE Signed Contract Agreement
    clientAndVeSigned: varchar("client_and_ve_signed", { length: 500 }),
    clientAndVeSignedDate: date("client_and_ve_signed_date"),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }),
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => [
    index("idx_wo_details_basic_detail").on(table.woBasicDetailId),
    index("idx_wo_details_status").on(table.status),
]);

// WO Acceptance - TL review and acceptance workflow
export const woAcceptance = pgTable("wo_acceptance", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull().unique()
        .references(() => woDetails.id, { onDelete: "cascade" }),
    // Query tracking
    queryRaisedAt: timestamp("query_raised_at", { withTimezone: true }),
    queryRespondedAt: timestamp("query_responded_at", { withTimezone: true }),

    // Decision: 'pending' | 'queries_raised' | 'accepted' | 'amendment_needed' | 'rejected'
    finalDecisionAt: timestamp("final_decision_at", { withTimezone: true }),
    decision: varchar("decision", { length: 50 }),
    decisionRemarks: text("decision_remarks"),

    // Amendment tracking
    hasAmendmentsToReview: boolean("has_amendments_to_review").default(false),
    amendmentsReviewedAt: timestamp("amendments_reviewed_at", { withTimezone: true }),
    followupId: bigint("followup_id", { mode: "number" }),
    followupInitiatedAt: timestamp("followup_initiated_at", { withTimezone: true }),

    // Amended WO
    amendedWoReceivedAt: timestamp("amended_wo_received_at", { withTimezone: true }),
    amendedWoFilePath: varchar("amended_wo_file_path", { length: 500 }),
    reReviewCount: integer("re_review_count").default(0),

    // Acceptance
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    // OE Digital Signature
    oeSignatureRequired: boolean("oe_signature_required").default(true),
    oeSignedAt: timestamp("oe_signed_at", { withTimezone: true }),
    oeSignedBy: bigint("oe_signed_by", { mode: "number" }),
    oeSignatureFilePath: varchar("oe_signature_file_path", { length: 500 }),

    // TL Digital Signature
    tlSignatureRequired: boolean("tl_signature_required").default(true),
    tlSignedAt: timestamp("tl_signed_at", { withTimezone: true }),
    tlSignedBy: bigint("tl_signed_by", { mode: "number" }),
    tlSignatureFilePath: varchar("tl_signature_file_path", { length: 500 }),

    // Authority Letter
    authorityLetterGenerated: boolean("authority_letter_generated").default(false),
    authorityLetterPath: varchar("authority_letter_path", { length: 500 }),
    authorityLetterGeneratedAt: timestamp("authority_letter_generated_at", { withTimezone: true }),

    // Final Signed WO
    signedWoFilePath: varchar("signed_wo_file_path", { length: 500 }),
    signedWoUploadedAt: timestamp("signed_wo_uploaded_at", { withTimezone: true }),
    signedWoUploadedBy: bigint("signed_wo_uploaded_by", { mode: "number" }),

    // Courier
    courierId: bigint("courier_id", { mode: "number" }),

    // Status: 'pending_review' | 'in_review' | 'queries_pending' | 'awaiting_amendment' | 'pending_signatures' | 'pending_courier' | 'completed'
    status: varchar("status", { length: 50 }).default('pending_review'),
    isCompleted: boolean("is_completed").default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }),
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => [
    index("idx_wo_acceptance_wo_detail").on(table.woDetailId),
    index("idx_wo_acceptance_status").on(table.status),
    index("idx_wo_acceptance_decision").on(table.decision),
]);

// WO Amendments - Created by OE/TE or TL, linked to woDetails
export const woAmendments = pgTable("wo_amendments", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    // Creator role: 'OE' | 'TE' | 'TL'
    createdByRole: varchar("created_by_role", { length: 10 }).notNull(),

    // Amendment details
    pageNo: varchar("page_no", { length: 100 }),
    clauseNo: varchar("clause_no", { length: 100 }),
    currentStatement: text("current_statement"),
    correctedStatement: text("corrected_statement"),

    // TL Review (for OE/TE amendments)
    tlApproved: boolean("tl_approved"),
    tlRemarks: text("tl_remarks"),
    tlReviewedAt: timestamp("tl_reviewed_at", { withTimezone: true }),

    // Status: 'draft' | 'submitted' | 'tl_approved' | 'tl_rejected' | 'communicated' | 'client_acknowledged' | 'resolved' | 'rejected_by_client'
    status: varchar("status", { length: 50 }).default('draft'),

    // Client followup
    communicatedAt: timestamp("communicated_at", { withTimezone: true }),
    communicatedBy: bigint("communicated_by", { mode: "number" }),
    clientResponse: text("client_response"),
    clientProof: text("client_proof"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),

    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => ([
    index("idx_wo_amendments_detail").on(table.woDetailId),
    index("idx_wo_amendments_status").on(table.status),
    index("idx_wo_amendments_role").on(table.createdByRole),
]));

// WO Queries - TL queries to TE/OE during review
export const woQueries = pgTable("wo_queries", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailsId: bigint("wo_details_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    // Query details
    queryBy: bigint("query_by", { mode: "number" }).notNull(),
    queryTo: varchar("query_to", { length: 50 }).notNull(), // 'TE' | 'OE' | 'BOTH'
    queryToUserIds: jsonb("query_to_user_ids").$type<number[]>(),
    queryText: text("query_text").notNull(),
    queryRaisedAt: timestamp("query_raised_at", { withTimezone: true }).notNull().defaultNow(),

    // Response
    responseText: text("response_text"),
    respondedBy: bigint("responded_by", { mode: "number" }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),

    // Status: 'pending' | 'responded' | 'closed' | 'escalated'
    status: varchar("status", { length: 50 }).default('pending'),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
    index("idx_wo_queries_acceptance").on(table.woDetailsId),
    index("idx_wo_queries_status").on(table.status),
    index("idx_wo_queries_by").on(table.queryBy),
]));

// WO Documents - All WO-related documents with versioning
export const woDocuments = pgTable("wo_documents", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }),

    // Type: 'draftWo' | 'acceptedWoSigned' | 'finalWo' | 'detailedWo' | 'sapPo' | 'foa'
    type: varchar("type", { length: 50 }),
    version: integer("version"),
    filePath: varchar("file_path", { length: 500 }),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedBy: bigint("uploaded_by", { mode: "number" }),
}, (table) => [
    index("idx_wo_documents_detail").on(table.woDetailId),
    index("idx_wo_documents_type").on(table.type),
]);

// WO Contacts - Client contacts across departments
export const woContacts = pgTable("wo_contacts", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woBasicDetailId: bigint("wo_basic_detail_id", { mode: "number" })
        .references(() => woBasicDetails.id, { onDelete: "cascade" }),

    organization: varchar("organization", { length: 100 }),
    departments: varchar("departments", { length: 20 }), // 'EIC' | 'User' | 'C&P' | 'Finance'
    name: varchar("name", { length: 255 }),
    designation: varchar("designation", { length: 50 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_wo_contacts_basic_detail").on(table.woBasicDetailId),
]);

// WO Billing BOQ
export const woBillingBoq = pgTable("wo_billing_boq", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNo: integer("sr_no").notNull(),
    itemDescription: text("item_description").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }),
    sortOrder: integer("sort_order"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
    index("idx_billing_boq_wo_detail").on(table.woDetailId),
    index("idx_billing_boq_sort_order").on(table.sortOrder),
]));

// WO Buyback BOQ
export const woBuybackBoq = pgTable("wo_buyback_boq", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNo: integer("sr_no").notNull(),
    itemDescription: text("item_description").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 20, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }),
    sortOrder: integer("sort_order"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ([
    index("idx_buyback_boq_wo_detail").on(table.woDetailId),
]));

// WO Billing Addresses
export const woBillingAddresses = pgTable("wo_billing_addresses", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    srNos: jsonb("sr_nos").$type<number[] | 'all'>().notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    address: text("address").notNull(),
    gst: varchar("gst", { length: 15 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    index("idx_billing_addr_wo_detail").on(table.woDetailId),
]);

// WO Shipping Addresses
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

// Type Exports
export type WoBasicDetails = typeof woBasicDetails.$inferSelect;
export type NewWoBasicDetails = typeof woBasicDetails.$inferInsert;

export type WoDetail = typeof woDetails.$inferSelect;
export type NewWoDetail = typeof woDetails.$inferInsert;

export type WoAcceptance = typeof woAcceptance.$inferSelect;
export type NewWoAcceptance = typeof woAcceptance.$inferInsert;

export type WoAmendment = typeof woAmendments.$inferSelect;
export type NewWoAmendment = typeof woAmendments.$inferInsert;

export type WoQuery = typeof woQueries.$inferSelect;
export type NewWoQuery = typeof woQueries.$inferInsert;

export type WoDocument = typeof woDocuments.$inferSelect;
export type NewWoDocument = typeof woDocuments.$inferInsert;

export type WoContact = typeof woContacts.$inferSelect;
export type NewWoContact = typeof woContacts.$inferInsert;

export type WoBillingBoq = typeof woBillingBoq.$inferSelect;
export type NewWoBillingBoq = typeof woBillingBoq.$inferInsert;

export type WoBuybackBoq = typeof woBuybackBoq.$inferSelect;
export type NewWoBuybackBoq = typeof woBuybackBoq.$inferInsert;

export type WoBillingAddress = typeof woBillingAddresses.$inferSelect;
export type NewWoBillingAddress = typeof woBillingAddresses.$inferInsert;

export type WoShippingAddress = typeof woShippingAddresses.$inferSelect;
export type NewWoShippingAddress = typeof woShippingAddresses.$inferInsert;
