import { z } from "zod";

// ============================================
// WO AMENDMENTS SCHEMAS
// ============================================

/**
 * Schema for creating a new WO Amendment
 */
export const CreateWoAmendmentSchema = z.object({
  woDetailId: z.number().int().positive({
    message: "Valid WO Detail ID is required",
  }),

  // Amendment details
  pageNo: z.string().max(100),
  clauseNo: z.string().max(100),
  currentStatement: z.string().min(1, "Current statement is required"),
  correctedStatement: z.string().min(1, "Corrected statement is required"),
});

export type CreateWoAmendmentDto = z.infer<typeof CreateWoAmendmentSchema>;

/**
 * Schema for updating WO Amendment
 */
export const UpdateWoAmendmentSchema = CreateWoAmendmentSchema.partial().omit({
  woDetailId: true,
});

export type UpdateWoAmendmentDto = z.infer<typeof UpdateWoAmendmentSchema>;

/**
 * Schema for bulk amendment creation
 */
export const CreateBulkWoAmendmentsSchema = z.object({
  woDetailId: z.number().int().positive(),
  amendments: z.array(
    z.object({
      pageNo: z.string().max(100),
      clauseNo: z.string().max(100),
      currentStatement: z.string().min(1),
      correctedStatement: z.string().min(1),
    })
  ).min(1, "At least one amendment is required"),
});

export type CreateBulkWoAmendmentsDto = z.infer<typeof CreateBulkWoAmendmentsSchema>;

/**
 * Schema for filtering/querying WO Amendments
 */
export const WoAmendmentsQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woDetailId: z.coerce.number().int().positive().optional(),
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),

  // Search
  search: z.string().max(255).optional(),

  // Date filters
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),

  // Sorting
  sortBy: z
    .enum(["createdAt", "updatedAt", "pageNo", "clauseNo"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc").optional(),
});

export type WoAmendmentsQueryDto = z.infer<typeof WoAmendmentsQuerySchema>;
