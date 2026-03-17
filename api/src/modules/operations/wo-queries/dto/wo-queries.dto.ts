import { z } from "zod";

// ============================================
// WO QUERIES SCHEMAS
// ============================================

export const QueryToEnum = z.enum(["TE", "OE", "BOTH"]);
export const QueryStatusEnum = z.enum(["pending", "responded", "closed"]);

/**
 * Schema for creating a new WO Query
 */
export const CreateWoQuerySchema = z.object({
  woDetailId: z.number().int().positive({
    message: "Valid WO Detail ID is required",
  }),

  queryBy: z.number().int().positive({
    message: "Valid user ID required for queryBy",
  }),
  queryTo: QueryToEnum,
  queryText: z.string().min(1, "Query text is required").max(2000),
});

export type CreateWoQueryDto = z.infer<typeof CreateWoQuerySchema>;

/**
 * Schema for responding to a query
 */
export const RespondToQuerySchema = z.object({
  responseText: z.string().min(1, "Response text is required").max(2000),
  respondedBy: z.number().int().positive({
    message: "Valid user ID required for respondedBy",
  }),
});

export type RespondToQueryDto = z.infer<typeof RespondToQuerySchema>;

/**
 * Schema for closing a query
 */
export const CloseQuerySchema = z.object({
  closedBy: z.number().int().positive().optional(),
  closureNotes: z.string().max(500).optional(),
});

export type CloseQueryDto = z.infer<typeof CloseQuerySchema>;

/**
 * Schema for updating query status
 */
export const UpdateQueryStatusSchema = z.object({
  status: QueryStatusEnum,
});

export type UpdateQueryStatusDto = z.infer<typeof UpdateQueryStatusSchema>;

/**
 * Schema for filtering/querying WO Queries
 */
export const WoQueriesQuerySchema = z.object({
  // Pagination
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),

  // Filters
  woDetailId: z.coerce.number().int().positive().optional(),
  status: QueryStatusEnum.optional(),
  queryTo: QueryToEnum.optional(),
  queryBy: z.coerce.number().int().positive().optional(),
  respondedBy: z.coerce.number().int().positive().optional(),

  // Date filters
  queryRaisedFrom: z.string().datetime().optional(),
  queryRaisedTo: z.string().datetime().optional(),
  respondedFrom: z.string().datetime().optional(),
  respondedTo: z.string().datetime().optional(),

  // Search
  search: z.string().max(255).optional(),

  // Sorting
  sortBy: z
    .enum(["queryRaisedAt", "respondedAt", "status", "createdAt"])
    .default("queryRaisedAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type WoQueriesQueryDto = z.infer<typeof WoQueriesQuerySchema>;

/**
 * Schema for bulk query creation
 */
export const CreateBulkWoQueriesSchema = z.object({
  woDetailId: z.number().int().positive(),
  queryBy: z.number().int().positive(),
  queries: z.array(
    z.object({
      queryTo: QueryToEnum,
      queryText: z.string().min(1).max(2000),
    })
  ).min(1, "At least one query is required"),
});

export type CreateBulkWoQueriesDto = z.infer<typeof CreateBulkWoQueriesSchema>;
