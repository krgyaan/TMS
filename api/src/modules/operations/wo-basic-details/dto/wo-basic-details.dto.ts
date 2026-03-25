import { z } from "zod";

// ============================================
// WO BASIC DETAILS SCHEMAS
// ============================================

/**
 * Schema for creating new WO Basic Details
 * Used by TE (Tendering Executive) within 12 hours of PO receipt
 */
export const CreateWoBasicDetailSchema = z.object({
  teamId: z.number().int().positive().optional(),
  // Source reference - one of these should be provided
  tenderId: z.number().int().positive().optional(),
  enquiryId: z.number().int().positive().optional(),

  // Core WO information
  woNumber: z.string().max(255).optional(),
  woDate: z.string().date().optional(), // ISO date string "YYYY-MM-DD"
  projectCode: z.string().max(100).optional(), // Auto-generated, optional on create
  projectName: z.string().max(255).optional(),

  // Workflow state tracking
  currentStage: z.enum(["basic_details", "wo_details", "wo_acceptance", "wo_upload", "completed"]).optional(),

  // Financial details
  woValuePreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  woValueGstAmt: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  receiptPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  budgetPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
  grossMargin: z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),

  // Document upload
  woDraft: z.string().max(255).optional(),

  // Checklist and TMS Documents
  teChecklistConfirmed: z.boolean().optional(),
  tmsDocuments: z.record(z.boolean()).optional(),
});

export type CreateWoBasicDetailDto = z.infer<typeof CreateWoBasicDetailSchema>;
export const UpdateWoBasicDetailSchema = CreateWoBasicDetailSchema.partial();
export type UpdateWoBasicDetailDto = z.infer<typeof UpdateWoBasicDetailSchema>;

// ============================================
// OE ASSIGNMENT SCHEMAS
// ============================================

/**
 * Schema for assigning Operations Executive (OE) to a project
 * Used by TL within 12 hours of Basic Details creation
 */
export const AssignOeSchema = z.object({
    woBasicDetailId: z.number().int().positive().optional(),
    oeFirst: z.number().int().positive().nullable().optional(),
    oeFirstAssignedAt: z.coerce.date().nullable().optional(),
    oeFirstAssignedBy: z.number().int().positive().nullable().optional(),
    oeSiteVisit: z.number().int().positive().nullable().optional(),
    oeSiteVisitAssignedAt: z.coerce.date().nullable().optional(),
    oeSiteVisitAssignedBy: z.number().int().positive().nullable().optional(),
    oeDocsPrep: z.number().int().positive().nullable().optional(),
    oeDocsPrepAssignedAt: z.coerce.date().nullable().optional(),
    oeDocsPrepAssignedBy: z.number().int().positive().nullable().optional(),
});

export type AssignOeDto = z.infer<typeof AssignOeSchema>;

/**
 * Schema for bulk OE assignment
 * Allows TL to assign multiple OEs at once
 */
export const BulkAssignOeSchema = z.object({
  assignments: z.array(
    z.object({
      assignmentType: z.enum(["first", "siteVisit", "docsPrep"]),
      oeUserId: z.number().int().positive(),
    })
  ).min(1, "At least one assignment is required"),
  assignedBy: z.number().int().positive().optional(),
});

export type BulkAssignOeDto = z.infer<typeof BulkAssignOeSchema>;

/**
 * Schema for removing OE assignment
 */
export const RemoveOeAssignmentSchema = z.object({
  assignmentType: z.enum(["first", "siteVisit", "docsPrep"]),
});

export type RemoveOeAssignmentDto = z.infer<typeof RemoveOeAssignmentSchema>;

// ============================================
// QUERY/FILTER SCHEMAS
// ============================================

/**
 * Schema for filtering/querying WO Basic Details list
 */
export const WoBasicDetailsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  tenderId: z.coerce.number().int().positive().optional(),
  enquiryId: z.coerce.number().int().positive().optional(),
  teamId: z.coerce.number().int().positive().optional(),
  unallocated: z.coerce.boolean().optional(),
  projectCode: z.string().max(100).optional(),
  projectName: z.string().max(255).optional(),
  currentStage: z
    .enum([
      "basic_details",
      "wo_details",
      "wo_acceptance",
      "wo_upload",
      "completed",
    ])
    .optional(),
  oeFirst: z.coerce.number().int().positive().optional(),
  oeSiteVisit: z.coerce.number().int().positive().optional(),
  oeDocsPrep: z.coerce.number().int().positive().optional(),
  isWorkflowPaused: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),

  // Date range filters
  woDateFrom: z.string().date().optional(),
  woDateTo: z.string().date().optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
  // Sorting
  sortBy: z
    .enum([
      "woDate",
      "projectCode",
      "woNumber",
      "projectName",
      "woValuePreGst",
      "woValueGstAmt",
      "grossMargin",
      "oeFirstName",
      "oeSiteVisitName",
      "oeDocsPrepName",
      "currentStage",
    ])
    .default("woDate")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
  status: z.array(z.coerce.number()).optional(),
  // Search
  search: z.string().max(255).optional(), // Search across projectName, woNumber, projectCode
});

import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
export type WoBasicDetailsQueryDto = z.infer<typeof WoBasicDetailsQuerySchema> & {
  user?: ValidatedUser;
};

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * Schema for WO Basic Details response with related data
 */
export const WoBasicDetailsResponseSchema = z.object({
  id: z.number(),
  tenderId: z.number().nullable(),
  enquiryId: z.number().nullable(),
  woNumber: z.string().nullable(),
  woDate: z.string().nullable(),
  projectCode: z.string(),
  projectName: z.string().nullable(),
  currentStage: z.string(),
  woValuePreGst: z.string().nullable(),
  woValueGstAmt: z.string().nullable(),
  receiptPreGst: z.string().nullable(),
  budgetPreGst: z.string().nullable(),
  grossMargin: z.string().nullable(),
  woDraft: z.string().nullable(),
  teChecklistConfirmed: z.boolean().nullable(),
  tmsDocuments: z.any().nullable(),

  // Joined Data
  oeFirstName: z.string().nullable().optional(),
  oeSiteVisitName: z.string().nullable().optional(),
  oeDocsPrepName: z.string().nullable().optional(),

  // OE assignments
  oeFirst: z.number().nullable(),
  oeFirstAssignedAt: z.string().nullable(),
  oeFirstAssignedBy: z.number().nullable(),
  oeSiteVisit: z.number().nullable(),
  oeSiteVisitAssignedAt: z.string().nullable(),
  oeSiteVisitAssignedBy: z.number().nullable(),
  oeDocsPrep: z.number().nullable(),
  oeDocsPrepVisitAssignedAt: z.string().nullable(),
  oeDocsPrepVisitAssignedBy: z.number().nullable(),

  // Workflow control
  isWorkflowPaused: z.boolean(),
  workflowPausedAt: z.string().nullable(),
  workflowResumedAt: z.string().nullable(),

  // Timestamps
  createdAt: z.string(),
  updatedAt: z.string(),

  // Related data (optional, populated on demand)
  contacts: z.array(z.any()).optional(),
  woDetail: z.any().optional(),
});

export type WoBasicDetailsResponseDto = z.infer<typeof WoBasicDetailsResponseSchema>;

/**
 * Paginated list response schema
 */
export const WoBasicDetailsListResponseSchema = z.object({
  data: z.array(WoBasicDetailsResponseSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type WoBasicDetailsListResponseDto = z.infer<typeof WoBasicDetailsListResponseSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Schema for validating financial calculations
 */
export const CalculateGrossMarginSchema = z.object({
  receiptPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/),
  budgetPreGst: z.string().regex(/^\d+(\.\d{1,2})?$/),
});

export type CalculateGrossMarginDto = z.infer<typeof CalculateGrossMarginSchema>;

/**
 * Schema for validating project code uniqueness
 */
export const CheckProjectCodeSchema = z.object({
  projectCode: z.string().max(100),
});

export type CheckProjectCodeDto = z.infer<typeof CheckProjectCodeSchema>;
