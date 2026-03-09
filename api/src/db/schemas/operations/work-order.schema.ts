import { text, integer, index, pgTable, bigint, varchar, timestamp, numeric, date, boolean } from "drizzle-orm/pg-core";

/**
 * WO Basic Details Table
 * =====================
 * Stores the initial project information filled by TE (Tendering Executive) within 12 hours of PO receipt.
 * This is the first step in the WO workflow and creates the project in the system.
 * Once filled, the project appears on Project Dashboard and triggers TL assignment workflow.
 */
export const woBasicDetails = pgTable("wo_basic_details", {
    id: bigint("id", { mode: "number" }).primaryKey(),

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
    wo_draft: varchar("image", { length: 255 }), // Upload LOA/GEM PO/LOI/Draft WO document path

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
    createdAt: timestamp("created_at", { withTimezone: true }), // When TE created the basic details
    updatedAt: timestamp("updated_at", { withTimezone: true }), // Last update timestamp
});

/**
 * WO Details Table
 * ================
 * Stores detailed WO information and client contacts filled after Basic Details.
 * Includes contractual terms (LD, PBG, agreements) and triggers WO Acceptance workflow.
 * Email sent to TL and CEO with PSS and WO Dashboard Link once filled.
 */
export const woDetails = pgTable("wo_details",{
        id: bigint("id", { mode: "number" }).primaryKey(),
        woBasicDetailId: bigint("wo_basic_detail_id", { mode: "number" }), // FK to woBasicDetails

        // Liquidated Damages (LD) configuration
        ldApplicable: boolean("ld_applicable").default(true), // Whether LD clause applies
        maxLd: numeric("max_ld", { precision: 5, scale: 2 }), // Maximum LD percentage (if LD applicable)
        ldStartDate: date("ld_start_date"), // Date from which LD calculation starts
        maxLdDate: date("max_ld_date"), // Maximum date until which LD can be charged

        // Performance Bank Guarantee (PBG) configuration
        isPbgApplicable: boolean("is_pbg_applicable").notNull().default(false), // Whether PBG required
        filledBgFormat: varchar("filled_bg_format", { length: 255 }), // Upload filled BG format (if PBG = Yes)

        // Contract Agreement configuration
        isContractAgreement: boolean("is_contract_agreement").notNull().default(false), // Whether contract agreement needed
        contractAgreementFormat: varchar("contract_agreement_format", { length: 255 }), // Upload contract agreement format

        // Budget validation
        budgetPreGst: numeric("budget_pre_gst", { precision: 20, scale: 2 }), // Auto-filled from Pricing Module (TMS) or manual

        // ============================================
        // WO ACCEPTANCE FORM FIELDS (TL Step)
        // ============================================
        // TL reviews complete project summary and either accepts or requests amendments
        woAcceptance: boolean("wo_acceptance").default(false), // Whether TL has accepted the WO
        woAcceptanceAt: timestamp("wo_acceptance_at", { withTimezone: true }), // When TL accepted
        woAmendmentNeeded: boolean("wo_amendment_needed").default(false), // Whether PO edits required from client

        // If amendment needed, followup is initiated using client contacts from woContacts
        followupId: bigint("followup_id", { mode: "number" }), // Reference to followup entry in Followup Dashboard
        courierId: bigint("couried_id", { mode: "number" }), // Reference to courier entry for sending signed WO

        // TL Timeline Management (SLA: 24hrs for queries, 24hrs for TE/OE response, 12hrs for final decision)
        tlId: bigint("tl_id", { mode: "number" }), // Team Leader who reviews and accepts/rejects
        tlQueryRaisedAt: timestamp("tl_query_raised_at", { withTimezone: true }), // When TL raised queries to TE/OE (24hr deadline)
        tlFinalDecisionAt: timestamp("tl_final_decision_at", { withTimezone: true }), // When TL made final accept/edit decision (12hr after response)

        // Record status
        status: boolean("status").notNull().default(true), // Active/Inactive flag
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ([{basicIdx: index("idx_wo_basic_detail_id").on(table.woBasicDetailId)}])
);

/**
 * WO Amendments Table
 * ===================
 * Stores amendment requests when TL identifies issues in WO that need client correction.
 * Multiple amendments can be requested per WO. Each amendment tracks specific clause changes.
 * Initiates followup workflow when woAmendmentNeeded = true in woDetails.
 */
export const woAmendments = pgTable("wo_amendments", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }), // FK to woDetails

    // Amendment details - identifies exact location and changes needed
    pageNo: varchar("page_no", { length: 100 }), // Page number in WO document
    clauseNo: varchar("clause_no", { length: 100 }), // Clause/section number
    currentStatement: text("current_statement"), // Current text in WO (what client wrote)
    correctedStatement: text("corrected_statement"), // Proposed correction (what should be)

    createdAt: timestamp("created_at", { withTimezone: true }), // When amendment was requested
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

/**
 * WO Documents Table
 * ==================
 * Stores all WO-related documents with version control.
 * Upload sequence: Draft WO → Accepted & Signed WO → Detailed/SAP PO (if applicable)
 * Detailed WO upload only if isDetailedWoApplicable = true in workflow.
 */
export const woDocuments = pgTable("wo_documents", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  woDetailId: bigint("wo_detail_id", { mode: "number" }), // FK to woDetails

  // Document type and versioning
  type: varchar("type", { length: 50 }), // Enum: 'draftWo' | 'acceptedWoSigned' | 'finalWo' | 'detailedWo' | 'sapPo' | 'foa'
  version: integer("version"), // Version number (for tracking amendments)
  filePath: varchar("file_path", { length: 500 }), // Storage path of uploaded document
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow() // Upload timestamp
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
    id: bigint("id", { mode: "number" }).primaryKey(),
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

/**
 * WO Queries Table
 * ================
 * Tracks TL queries to TE/OE during WO Acceptance phase.
 * Timeline: TL has 24hrs to raise queries, TE/OE has 24hrs to respond, TL has 12hrs for final decision.
 * TL can query TE, OE, or both simultaneously.
 */
export const woQueries = pgTable("wo_queries", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull(), // FK to woDetails

    // Query metadata
    queryBy: bigint("query_by", { mode: "number" }).notNull(), // TL user ID who raised the query
    queryTo: varchar("query_to", { length: 50 }).notNull(), // Target: 'TE' | 'OE' | 'BOTH' (comma-separated user IDs)
    queryText: text("query_text").notNull(), // Query content/question
    queryRaisedAt: timestamp("query_raised_at", { withTimezone: true }).notNull().defaultNow(), // When query was raised

    // Response tracking
    responseText: text("response_text"), // TE/OE response to the query
    respondedBy: bigint("responded_by", { mode: "number" }), // User ID who responded
    respondedAt: timestamp("responded_at", { withTimezone: true }), // Response timestamp

    // Query lifecycle
    status: varchar("status", { length: 50 }).default('pending'), // Enum: 'pending' | 'responded' | 'closed'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// TypeScript Type Exports
// ============================================

export type WoBasicDetails = typeof woBasicDetails.$inferSelect;
export type NewWoBasicDetails = typeof woBasicDetails.$inferInsert;

export type WoDetail = typeof woDetails.$inferSelect;
export type NewWoDetail = typeof woDetails.$inferInsert;

export type WoContact = typeof woContacts.$inferSelect;
export type NewWoContact = typeof woContacts.$inferInsert;

export type WoAmendment = typeof woAmendments.$inferSelect;
export type NewWoAmendment = typeof woAmendments.$inferInsert;

export type WoDocument = typeof woDocuments.$inferSelect;
export type NewWoDocument = typeof woDocuments.$inferInsert;

export type WoQuery = typeof woQueries.$inferSelect;
export type NewWoQuery = typeof woQueries.$inferInsert;
