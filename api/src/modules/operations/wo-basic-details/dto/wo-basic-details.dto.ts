import { z } from "zod";

// ============================================
// WO Basic Details DTOs
// ============================================
export const CreateWoBasicDetailSchema = z.object({
  // Source reference - one of these should be provided
  tenderId: z.number().int().positive().optional(),
  enquiryId: z.number().int().positive().optional(),

  // Core WO information
  woNumber: z.string().max(255).optional(),
  woDate: z.string().date().optional(), // ISO date string "YYYY-MM-DD"
  projectCode: z.string().max(100).optional(),
  projectName: z.string().max(255).optional(),

  // Workflow state tracking
  currentStage: z.enum(["basic_details", "wo_details", "wo_acceptance", "wo_upload", "completed"]).optional(),

  // Financial details
  woValuePreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  woValueGstAmt: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  receiptPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  budgetPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  grossMargin: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),

  // Document upload
  wo_draft: z.string().max(255).optional(),

  // Operations Executive assignments
  oeFirst: z.number().int().positive().optional(),
  oeFirstAssignedAt: z.string().datetime().optional(),
  oeFirstAssignedBy: z.number().int().positive().optional(),

  oeSiteVisit: z.number().int().positive().optional(),
  oeSiteVisitAssignedAt: z.string().datetime().optional(),
  oeSiteVisitAssignedBy: z.number().int().positive().optional(),

  oeDocsPrep: z.number().int().positive().optional(),
  oeDocsPrepVisitAssignedAt: z.string().datetime().optional(),
  oeDocsPrepVisitAssignedBy: z.number().int().positive().optional(),

  // Workflow control
  isWorkflowPaused: z.boolean().default(false).optional(),
  workflowPausedAt: z.string().datetime().optional(),
  workflowResumedAt: z.string().datetime().optional(),
});

export type CreateWoBasicDetailDto = z.infer<typeof CreateWoBasicDetailSchema>;
export const UpdateWoBasicDetailSchema = CreateWoBasicDetailSchema.partial();
export type UpdateWoBasicDetailDto = z.infer<typeof UpdateWoBasicDetailSchema>;

// ============================================
// WO Details DTOs
// ============================================
export const CreateWoDetailSchema = z.object({
  woBasicDetailId: z.number().int().positive(),

  // Liquidated Damages (LD) configuration
  ldApplicable: z.boolean().default(true).optional(),
  maxLd: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  ldStartDate: z.string().date().optional(),
  maxLdDate: z.string().date().optional(),

  // Performance Bank Guarantee (PBG) configuration
  isPbgApplicable: z.boolean().default(false),
  filledBgFormat: z.string().max(255).optional(),

  // Contract Agreement configuration
  isContractAgreement: z.boolean().default(false),
  contractAgreementFormat: z.string().max(255).optional(),

  // Budget validation
  budgetPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),

  // WO Acceptance Form Fields
  woAcceptance: z.boolean().default(false).optional(),
  woAcceptanceAt: z.string().datetime().optional(),
  woAmendmentNeeded: z.boolean().default(false).optional(),

  // Followup and courier references
  followupId: z.number().int().positive().optional(),
  courierId: z.number().int().positive().optional(),

  // TL Timeline Management
  tlId: z.number().int().positive().optional(),
  tlQueryRaisedAt: z.string().datetime().optional(),
  tlFinalDecisionAt: z.string().datetime().optional(),

  // Record status
  status: z.boolean().default(true).optional(),
});

export type CreateWoDetailDto = z.infer<typeof CreateWoDetailSchema>;
export const UpdateWoDetailSchema = CreateWoDetailSchema.partial();
export type UpdateWoDetailDto = z.infer<typeof UpdateWoDetailSchema>;

// ============================================
// WO Contact DTOs
// ============================================
export const CreateWoContactSchema = z.object({
  woBasicDetailId: z.number().int().positive(),

  // Client organization details
  organization: z.string().max(100).optional(),
  departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),

  // Contact person details
  name: z.string().max(255).optional(),
  designation: z.string().max(50).optional(),
  phone: z.string().max(20).regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format").optional(),
  email: z.string().email().max(255).optional(),
});

export type CreateWoContactDto = z.infer<typeof CreateWoContactSchema>;
export const UpdateWoContactSchema = CreateWoContactSchema.partial();
export type UpdateWoContactDto = z.infer<typeof UpdateWoContactSchema>;

// ============================================
// WO Amendment DTOs
// ============================================
export const CreateWoAmendmentSchema = z.object({
  woDetailId: z.number().int().positive(),

  // Amendment details
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
});

export type CreateWoAmendmentDto = z.infer<typeof CreateWoAmendmentSchema>;
export const UpdateWoAmendmentSchema = CreateWoAmendmentSchema.partial();
export type UpdateWoAmendmentDto = z.infer<typeof UpdateWoAmendmentSchema>;

// ============================================
// WO Document DTOs
// ============================================
export const CreateWoDocumentSchema = z.object({
  woDetailId: z.number().int().positive(),

  // Document type and versioning
  type: z.enum(["draftWo", "acceptedWoSigned", "finalWo", "detailedWo", "sapPo", "foa"]),
  version: z.number().int().positive().optional(),
  filePath: z.string().max(500),
  uploadedAt: z.string().datetime().optional(),
});

export type CreateWoDocumentDto = z.infer<typeof CreateWoDocumentSchema>;
export const UpdateWoDocumentSchema = CreateWoDocumentSchema.partial();
export type UpdateWoDocumentDto = z.infer<typeof UpdateWoDocumentSchema>;

// ============================================
// WO Query DTOs
// ============================================
export const CreateWoQuerySchema = z.object({
  woDetailId: z.number().int().positive(),

  // Query metadata
  queryBy: z.number().int().positive(),
  queryTo: z.enum(["TE", "OE", "BOTH"]),
  queryText: z.string().min(1, "Query text is required"),
  queryRaisedAt: z.string().datetime().optional(),

  // Response tracking
  responseText: z.string().optional(),
  respondedBy: z.number().int().positive().optional(),
  respondedAt: z.string().datetime().optional(),

  // Query lifecycle
  status: z.enum(["pending", "responded", "closed"]).default("pending"),
});

export type CreateWoQueryDto = z.infer<typeof CreateWoQuerySchema>;
export const UpdateWoQuerySchema = CreateWoQuerySchema.partial();
export type UpdateWoQueryDto = z.infer<typeof UpdateWoQuerySchema>;

// ============================================
// Additional Utility Schemas
// ============================================

// Schema for assigning OE (used by TL)
export const AssignOeSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  assignmentType: z.enum(["first", "siteVisit", "docsPrep"]),
  oeUserId: z.number().int().positive(),
});
export type AssignOeDto = z.infer<typeof AssignOeSchema>;

// Schema for WO Acceptance decision by TL
export const WoAcceptanceDecisionSchema = z.object({
  woDetailId: z.number().int().positive(),
  accepted: z.boolean(),
  amendmentNeeded: z.boolean().optional(),
  amendments: z.array(
      z.object({
        pageNo: z.string().max(100),
        clauseNo: z.string().max(100),
        currentStatement: z.string(),
        correctedStatement: z.string(),
      })
    )
    .optional(),
});
export type WoAcceptanceDecisionDto = z.infer<typeof WoAcceptanceDecisionSchema>;

// Schema for responding to a query
export const QueryResponseSchema = z.object({
  woQueryId: z.number().int().positive(),
  responseText: z.string().min(1, "Response text is required"),
});
export type QueryResponseDto = z.infer<typeof QueryResponseSchema>;

// Schema for pausing/resuming workflow
export const WorkflowControlSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  action: z.enum(["pause", "resume"]),
});
export type WorkflowControlDto = z.infer<typeof WorkflowControlSchema>;

// Schema for bulk contact creation
export const CreateBulkWoContactsSchema = z.object({
  woBasicDetailId: z.number().int().positive(),
  contacts: z.array(
    z.object({
      organization: z.string().max(100).optional(),
      departments: z.enum(["EIC", "User", "C&P", "Finance"]).optional(),
      name: z.string().max(255).optional(),
      designation: z.string().max(50).optional(),
      phone: z.string().max(20).regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format").optional(),
      email: z.string().email().max(255).optional(),
    })
  ),
});
export type CreateBulkWoContactsDto = z.infer<typeof CreateBulkWoContactsSchema>;
