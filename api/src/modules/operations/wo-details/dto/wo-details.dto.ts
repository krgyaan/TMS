import { z } from "zod";

// ============================================
// WO DETAILS SCHEMAS
// ============================================

/**
 * Schema for creating WO Details
 * Filled after Basic Details are completed
 */
export const CreateWoDetailSchema = z.object({
  woBasicDetailId: z.number().int().positive({
    message: "Valid WO Basic Detail ID is required",
  }),

  // Liquidated Damages (LD) configuration
  ldApplicable: z.boolean().default(true),
  maxLd: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format")
    .optional(),
  ldStartDate: z.string().date().optional(),
  maxLdDate: z.string().date().optional(),

  // Performance Bank Guarantee (PBG) configuration
  isPbgApplicable: z.boolean().default(false),
  filledBgFormat: z.string().max(255).optional(),

  // Contract Agreement configuration
  isContractAgreement: z.boolean().default(false),
  contractAgreementFormat: z.string().max(255).optional(),

  // Budget validation
  budgetPreGst: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format")
    .optional(),

  // Record status
  status: z.boolean().default(true).optional(),
});

export type CreateWoDetailDto = z.infer<typeof CreateWoDetailSchema>;

/**
 * Schema for updating WO Details
 * All fields are optional for partial updates
 */
export const UpdateWoDetailSchema = CreateWoDetailSchema.partial();

export type UpdateWoDetailDto = z.infer<typeof UpdateWoDetailSchema>;

// ============================================
// WO ACCEPTANCE SCHEMAS
// ============================================

/**
 * Schema for TL to accept WO
 */
export const AcceptWoSchema = z.object({
  tlId: z.number().int().positive().optional(), // Auto-filled from auth context
  notes: z.string().max(1000).optional(),
});

export type AcceptWoDto = z.infer<typeof AcceptWoSchema>;

/**
 * Schema for TL to request amendments
 */
export const RequestAmendmentSchema = z.object({
  tlId: z.number().int().positive().optional(), // Auto-filled from auth context
  reason: z.string().min(1).max(1000),
  amendments: z.array(
    z.object({
      pageNo: z.string().max(100),
      clauseNo: z.string().max(100),
      currentStatement: z.string().min(1),
      correctedStatement: z.string().min(1),
    })
  ).min(1, "At least one amendment is required"),
  followupRequired: z.boolean().default(true),
});

export type RequestAmendmentDto = z.infer<typeof RequestAmendmentSchema>;

/**
 * Complete WO Acceptance Decision Schema
 * TL makes final decision after reviewing all details
 */
export const WoAcceptanceDecisionSchema = z.object({
  accepted: z.boolean(),
  tlId: z.number().int().positive().optional(),

  // If accepted
  notes: z.string().max(1000).optional(),

  // If not accepted (amendment needed)
  amendmentReason: z.string().max(1000).optional(),
  amendments: z.array(
    z.object({
      pageNo: z.string().max(100),
      clauseNo: z.string().max(100),
      currentStatement: z.string().min(1),
      correctedStatement: z.string().min(1),
    })
  ).optional(),
}).refine(
  (data) => {
    // If not accepted, amendments must be provided
    if (!data.accepted) {
      return data.amendments && data.amendments.length > 0 && data.amendmentReason;
    }
    return true;
  },
  {
    message: "Amendments and reason are required when WO is not accepted",
    path: ["amendments"],
  }
);

export type WoAcceptanceDecisionDto = z.infer<typeof WoAcceptanceDecisionSchema>;

// ============================================
// WO AMENDMENT SCHEMAS
// ============================================

/**
 * Schema for creating a single amendment
 */
export const CreateWoAmendmentSchema = z.object({
  pageNo: z.string().max(100),
  clauseNo: z.string().max(100),
  currentStatement: z.string().min(1, "Current statement is required"),
  correctedStatement: z.string().min(1, "Corrected statement is required"),
});

export type CreateWoAmendmentDto = z.infer<typeof CreateWoAmendmentSchema>;

/**
 * Schema for creating multiple amendments at once
 */
export const CreateBulkWoAmendmentsSchema = z.object({
  amendments: z.array(CreateWoAmendmentSchema).min(1, "At least one amendment is required"),
});

export type CreateBulkWoAmendmentsDto = z.infer<typeof CreateBulkWoAmendmentsSchema>;

/**
 * Schema for updating an amendment
 */
export const UpdateWoAmendmentSchema = CreateWoAmendmentSchema.partial();

export type UpdateWoAmendmentDto = z.infer<typeof UpdateWoAmendmentSchema>;

// ============================================
// WO DOCUMENT SCHEMAS
// ============================================

/**
 * Schema for uploading WO documents
 */
export const CreateWoDocumentSchema = z.object({
  type: z.enum([
    "draftWo",
    "acceptedWoSigned",
    "finalWo",
    "detailedWo",
    "sapPo",
    "foa",
  ], {
    required_error: "Document type is required",
    invalid_type_error: "Invalid document type",
  }),
  version: z.number().int().positive().default(1).optional(),
  filePath: z.string().max(500).min(1, "File path is required"),
  uploadedAt: z.string().datetime().optional(), // Auto-filled
});

export type CreateWoDocumentDto = z.infer<typeof CreateWoDocumentSchema>;

/**
 * Schema for updating document metadata
 */
export const UpdateWoDocumentSchema = z.object({
  version: z.number().int().positive().optional(),
  filePath: z.string().max(500).optional(),
});

export type UpdateWoDocumentDto = z.infer<typeof UpdateWoDocumentSchema>;

/**
 * Schema for bulk document upload
 */
export const CreateBulkWoDocumentsSchema = z.object({
  documents: z.array(CreateWoDocumentSchema).min(1, "At least one document is required"),
});

export type CreateBulkWoDocumentsDto = z.infer<typeof CreateBulkWoDocumentsSchema>;

// ============================================
// WO QUERY SCHEMAS
// ============================================

/**
 * Schema for TL to raise a query to TE/OE
 */
export const CreateWoQuerySchema = z.object({
  queryBy: z.number().int().positive().optional(), // Auto-filled from auth context
  queryTo: z.enum(["TE", "OE", "BOTH"], {
    required_error: "Query recipient is required",
  }),
  queryText: z.string().min(1, "Query text is required").max(2000),
  queryRaisedAt: z.string().datetime().optional(), // Auto-filled
});

export type CreateWoQueryDto = z.infer<typeof CreateWoQuerySchema>;

/**
 * Schema for TE/OE to respond to a query
 */
export const RespondToQuerySchema = z.object({
  responseText: z.string().min(1, "Response text is required").max(2000),
  respondedBy: z.number().int().positive().optional(), // Auto-filled from auth context
  respondedAt: z.string().datetime().optional(), // Auto-filled
});

export type RespondToQueryDto = z.infer<typeof RespondToQuerySchema>;

/**
 * Schema for closing a query
 */
export const CloseQuerySchema = z.object({
  closedBy: z.number().int().positive().optional(), // Auto-filled from auth context
  closureNotes: z.string().max(500).optional(),
});

export type CloseQueryDto = z.infer<typeof CloseQuerySchema>;

/**
 * Schema for updating query status
 */
export const UpdateQueryStatusSchema = z.object({
  status: z.enum(["pending", "responded", "closed"]),
});

export type UpdateQueryStatusDto = z.infer<typeof UpdateQueryStatusSchema>;

// ============================================
// QUERY/FILTER SCHEMAS
// ============================================

/**
 * Schema for filtering/querying WO Details list
 */
export const WoDetailsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woBasicDetailId: z.coerce.number().int().positive().optional(),
  ldApplicable: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  isPbgApplicable: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  isContractAgreement: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  woAcceptance: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  woAmendmentNeeded: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  status: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  tlId: z.coerce.number().int().positive().optional(),

  // Date range filters
  ldStartDateFrom: z.string().date().optional(),
  ldStartDateTo: z.string().date().optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  woAcceptanceAtFrom: z.string().datetime().optional(),
  woAcceptanceAtTo: z.string().datetime().optional(),

  // Sorting
  sortBy: z
    .enum([
      "createdAt",
      "updatedAt",
      "ldStartDate",
      "woAcceptanceAt",
      "budgetPreGst",
    ])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type WoDetailsQueryDto = z.infer<typeof WoDetailsQuerySchema>;

/**
 * Schema for filtering queries
 */
export const QueryFilterSchema = z.object({
  status: z.enum(["pending", "responded", "closed"]).optional(),
  queryTo: z.enum(["TE", "OE", "BOTH"]).optional(),
  queryBy: z.coerce.number().int().positive().optional(),
  respondedBy: z.coerce.number().int().positive().optional(),

  // Date filters
  queryRaisedFrom: z.string().datetime().optional(),
  queryRaisedTo: z.string().datetime().optional(),

  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Sorting
  sortBy: z.enum(["queryRaisedAt", "respondedAt"]).default("queryRaisedAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type QueryFilterDto = z.infer<typeof QueryFilterSchema>;

/**
 * Schema for filtering amendments
 */
export const AmendmentFilterSchema = z.object({
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),

  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Sorting
  sortBy: z.enum(["createdAt", "updatedAt", "pageNo"]).default("createdAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
});

export type AmendmentFilterDto = z.infer<typeof AmendmentFilterSchema>;

/**
 * Schema for filtering documents
 */
export const DocumentFilterSchema = z.object({
  type: z.enum([
    "draftWo",
    "acceptedWoSigned",
    "finalWo",
    "detailedWo",
    "sapPo",
    "foa",
  ]).optional(),
  version: z.coerce.number().int().positive().optional(),

  // Date filters
  uploadedFrom: z.string().datetime().optional(),
  uploadedTo: z.string().datetime().optional(),

  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Sorting
  sortBy: z.enum(["uploadedAt", "version", "type"]).default("uploadedAt").optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type DocumentFilterDto = z.infer<typeof DocumentFilterSchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * Schema for WO Details response with related data
 */
export const WoDetailsResponseSchema = z.object({
  id: z.number(),
  woBasicDetailId: z.number(),

  // LD configuration
  ldApplicable: z.boolean(),
  maxLd: z.string().nullable(),
  ldStartDate: z.string().nullable(),
  maxLdDate: z.string().nullable(),

  // PBG configuration
  isPbgApplicable: z.boolean(),
  filledBgFormat: z.string().nullable(),

  // Contract Agreement
  isContractAgreement: z.boolean(),
  contractAgreementFormat: z.string().nullable(),

  // Budget
  budgetPreGst: z.string().nullable(),

  // Acceptance workflow
  woAcceptance: z.boolean(),
  woAcceptanceAt: z.string().nullable(),
  woAmendmentNeeded: z.boolean(),
  followupId: z.number().nullable(),
  courierId: z.number().nullable(),

  // TL timeline
  tlId: z.number().nullable(),
  tlQueryRaisedAt: z.string().nullable(),
  tlFinalDecisionAt: z.string().nullable(),

  // Status
  status: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),

  // Related data (optional, populated on demand)
  amendments: z.array(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  queries: z.array(z.any()).optional(),
  woBasicDetail: z.any().optional(),
});

export type WoDetailsResponseDto = z.infer<typeof WoDetailsResponseSchema>;

/**
 * Paginated list response schema
 */
export const WoDetailsListResponseSchema = z.object({
  data: z.array(WoDetailsResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type WoDetailsListResponseDto = z.infer<typeof WoDetailsListResponseSchema>;
