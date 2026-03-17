import { z } from "zod";

// ============================================
// COMMON VALIDATORS
// ============================================

export const DecimalSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format")
  .or(z.number().transform(String));

export const PercentageSchema = z
  .string()
  .regex(/^(100(\.00?)?|\d{1,2}(\.\d{1,2})?)$/, "Invalid percentage (0-100)")
  .or(z.number().min(0).max(100).transform(String));

export const PositiveIntSchema = z.number().int().positive();

// ============================================
// ENUMS
// ============================================

export const WoDetailsStatusEnum = z.enum([
  "draft",
  "in_progress",
  "completed",
  "submitted_for_review",
]);

export type WoDetailsStatus = z.infer<typeof WoDetailsStatusEnum>;

// ============================================
// TENDER DOCUMENTS CHECKLIST (Page 1)
// ============================================

export const TenderDocumentsChecklistSchema = z.object({
  completeTenderDocuments: z.boolean().default(false),
  tenderInfo: z.boolean().default(false),
  emdInformation: z.boolean().default(false),
  physicalDocumentsSubmission: z.boolean().default(false),
  rfqAndQuotation: z.boolean().default(false),
  documentChecklist: z.boolean().default(false),
  costingSheet: z.boolean().default(false),
  result: z.boolean().default(false),
});

export type TenderDocumentsChecklist = z.infer<typeof TenderDocumentsChecklistSchema>;

// ============================================
// SITE VISIT PERSON (Page 5)
// ============================================

export const SiteVisitPersonSchema = z.object({
  name: z.string().max(255),
  phone: z.string().max(20),
  email: z.string().max(255),
});

export type SiteVisitPerson = z.infer<typeof SiteVisitPersonSchema>;

// ============================================
// CREATE WO DETAILS
// ============================================

export const CreateWoDetailSchema = z.object({
  woBasicDetailId: PositiveIntSchema,
});

export type CreateWoDetailDto = z.infer<typeof CreateWoDetailSchema>;

// ============================================
// UPDATE WO DETAILS (Full Update)
// ============================================

export const UpdateWoDetailSchema = z.object({
  // Page 1: Project Handover
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.optional(),

  // Page 2: Compliance Obligations
  ldApplicable: z.boolean().optional(),
  maxLd: PercentageSchema.nullable().optional(),
  ldStartDate: z.string().date().nullable().optional(),
  maxLdDate: z.string().date().nullable().optional(),

  isPbgApplicable: z.boolean().optional(),
  filledBgFormat: z.string().max(255).nullable().optional(),
  pbgBgId: PositiveIntSchema.nullable().optional(),

  isContractAgreement: z.boolean().optional(),
  contractAgreementFormat: z.string().max(255).nullable().optional(),

  detailedPoApplicable: z.boolean().optional(),
  detailedPoFollowupId: PositiveIntSchema.nullable().optional(),

  // Page 3: SWOT Analysis
  swotStrengths: z.string().nullable().optional(),
  swotWeaknesses: z.string().nullable().optional(),
  swotOpportunities: z.string().nullable().optional(),
  swotThreats: z.string().nullable().optional(),

  // Page 5: Project Execution
  siteVisitNeeded: z.boolean().optional(),
  siteVisitPerson: SiteVisitPersonSchema.nullable().optional(),
  documentsFromTendering: z.array(z.string()).nullable().optional(),
  documentsNeeded: z.array(z.string()).nullable().optional(),
  documentsInHouse: z.array(z.string()).nullable().optional(),

  // Page 6: Profitability
  costingSheetLink: z.string().url().max(500).nullable().optional(),
  hasDiscrepancies: z.boolean().optional(),
  discrepancyComments: z.string().nullable().optional(),

  budgetPreGst: DecimalSchema.nullable().optional(),
  budgetSupply: DecimalSchema.nullable().optional(),
  budgetService: DecimalSchema.nullable().optional(),
  budgetFreight: DecimalSchema.nullable().optional(),
  budgetAdmin: DecimalSchema.nullable().optional(),
  budgetBuybackSale: DecimalSchema.nullable().optional(),

  // Page 7: WO Acceptance (OE Step)
  oeWoAmendmentNeeded: z.boolean().optional(),
  oeSignaturePrepared: z.boolean().optional(),
  courierRequestPrepared: z.boolean().optional(),

  // Wizard Progress
  currentPage: z.number().int().min(1).max(7).optional(),
  status: WoDetailsStatusEnum.optional(),
});

export type UpdateWoDetailDto = z.infer<typeof UpdateWoDetailSchema>;

// ============================================
// QUERY/FILTER SCHEMA
// ============================================

export const WoDetailsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woBasicDetailId: z.coerce.number().int().positive().optional(),
  status: WoDetailsStatusEnum.optional(),
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
  siteVisitNeeded: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  hasDiscrepancies: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  createdBy: z.coerce.number().int().positive().optional(),

  // Date range filters
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),

  // Sorting
  sortBy: z
    .enum(["createdAt", "updatedAt", "currentPage", "status"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type WoDetailsQueryDto = z.infer<typeof WoDetailsQuerySchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const WoDetailResponseSchema = z.object({
  id: z.number(),
  woBasicDetailId: z.number(),

  // Page 1
  tenderDocumentsChecklist: TenderDocumentsChecklistSchema.nullable(),
  checklistCompletedAt: z.string().nullable(),
  checklistIncompleteNotifiedAt: z.string().nullable(),

  // Page 2
  ldApplicable: z.boolean(),
  maxLd: z.string().nullable(),
  ldStartDate: z.string().nullable(),
  maxLdDate: z.string().nullable(),
  isPbgApplicable: z.boolean(),
  filledBgFormat: z.string().nullable(),
  pbgBgId: z.number().nullable(),
  isContractAgreement: z.boolean(),
  contractAgreementFormat: z.string().nullable(),
  detailedPoApplicable: z.boolean(),
  detailedPoFollowupId: z.number().nullable(),

  // Page 3
  swotStrengths: z.string().nullable(),
  swotWeaknesses: z.string().nullable(),
  swotOpportunities: z.string().nullable(),
  swotThreats: z.string().nullable(),
  swotCompletedAt: z.string().nullable(),

  // Page 5
  siteVisitNeeded: z.boolean(),
  siteVisitPerson: SiteVisitPersonSchema.nullable(),
  documentsFromTendering: z.array(z.string()).nullable(),
  documentsNeeded: z.array(z.string()).nullable(),
  documentsInHouse: z.array(z.string()).nullable(),

  // Page 6
  costingSheetLink: z.string().nullable(),
  hasDiscrepancies: z.boolean(),
  discrepancyComments: z.string().nullable(),
  discrepancyNotifiedAt: z.string().nullable(),
  budgetPreGst: z.string().nullable(),
  budgetSupply: z.string().nullable(),
  budgetService: z.string().nullable(),
  budgetFreight: z.string().nullable(),
  budgetAdmin: z.string().nullable(),
  budgetBuybackSale: z.string().nullable(),

  // Page 7
  oeWoAmendmentNeeded: z.boolean().nullable(),
  oeAmendmentSubmittedAt: z.string().nullable(),
  oeSignaturePrepared: z.boolean(),
  courierRequestPrepared: z.boolean(),
  courierRequestPreparedAt: z.string().nullable(),

  // Wizard Progress
  currentPage: z.number(),
  completedPages: z.array(z.number()),
  skippedPages: z.array(z.number()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),

  // Status
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.number().nullable(),
  updatedBy: z.number().nullable(),

  // Relations (optional, populated on demand)
  woBasicDetail: z.any().optional(),
  contacts: z.array(z.any()).optional(),
  billingBoq: z.array(z.any()).optional(),
  buybackBoq: z.array(z.any()).optional(),
  billingAddresses: z.array(z.any()).optional(),
  shippingAddresses: z.array(z.any()).optional(),
  acceptance: z.any().optional(),
});

export type WoDetailResponseDto = z.infer<typeof WoDetailResponseSchema>;

export const WoDetailsListResponseSchema = z.object({
  data: z.array(WoDetailResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type WoDetailsListResponseDto = z.infer<typeof WoDetailsListResponseSchema>;

// ============================================
// WIZARD/PROGRESS SCHEMAS
// ============================================

export const PageNumberSchema = z.number().int().min(1).max(7);
export type PageNumber = z.infer<typeof PageNumberSchema>;

export const SkipPageSchema = z.object({
  pageNum: PageNumberSchema,
  reason: z.string().max(500).optional(),
});

export type SkipPageDto = z.infer<typeof SkipPageSchema>;

export const WizardProgressResponseSchema = z.object({
  currentPage: z.number(),
  completedPages: z.array(z.number()),
  skippedPages: z.array(z.number()),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  status: z.string(),
  percentComplete: z.number(),
  canSubmitForReview: z.boolean(),
  blockers: z.array(z.string()),
});

export type WizardProgressResponseDto = z.infer<typeof WizardProgressResponseSchema>;
