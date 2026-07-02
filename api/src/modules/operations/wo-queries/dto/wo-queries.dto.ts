import { z } from 'zod';

// ENUMS
export const QueryToEnum = z.enum(['TE', 'OE', 'BOTH']);
export const QueryStatusEnum = z.enum(['pending', 'responded', 'closed', 'escalated']);

export type QueryTo = z.infer<typeof QueryToEnum>;
export type QueryStatus = z.infer<typeof QueryStatusEnum>;

// CREATE
export const CreateWoQuerySchema = z.object({
  woDetailsId: z.number().int().positive(),
  queryBy: z.number().int().positive(),
  queryTo: QueryToEnum,
  queryToUserIds: z.array(z.number().int().positive()).optional(),
  queryText: z.string().min(1, 'Query text is required'),
});

export type CreateWoQueryDto = z.infer<typeof CreateWoQuerySchema>;

// BULK CREATE
export const CreateBulkWoQueriesSchema = z.object({
  woDetailsId: z.number().int().positive(),
  queryBy: z.number().int().positive(),
  queries: z.array(
    z.object({
      queryTo: QueryToEnum,
      queryToUserIds: z.array(z.number().int().positive()).optional(),
      queryText: z.string().min(1),
    })
  ),
});

export type CreateBulkWoQueriesDto = z.infer<typeof CreateBulkWoQueriesSchema>;

// RESPOND
export const RespondToQuerySchema = z.object({
  responseText: z.string().min(1, 'Response text is required'),
  respondedBy: z.number().int().positive(),
  respondedAt: z.string().datetime().optional(),
});

export type RespondToQueryDto = z.infer<typeof RespondToQuerySchema>;

// UPDATE
export const UpdateWoQuerySchema = z.object({
  queryText: z.string().min(1, 'Query text is required'),
});

export type UpdateWoQueryDto = z.infer<typeof UpdateWoQuerySchema>;

// CLOSE
export const CloseQuerySchema = z.object({
  remarks: z.string().optional(),
});

export type CloseQueryDto = z.infer<typeof CloseQuerySchema>;

// UPDATE STATUS
export const UpdateQueryStatusSchema = z.object({
  status: QueryStatusEnum,
});

export type UpdateQueryStatusDto = z.infer<typeof UpdateQueryStatusSchema>;

// QUERY/FILTERS
export const WoQueriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
  sortBy: z
    .enum(['queryRaisedAt', 'respondedAt', 'status'])
    .default('queryRaisedAt')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  woDetailsId: z.coerce.number().int().positive().optional(),
  status: QueryStatusEnum.optional(),
  queryTo: QueryToEnum.optional(),
  queryBy: z.coerce.number().int().positive().optional(),
  respondedBy: z.coerce.number().int().positive().optional(),
  queryRaisedFrom: z.string().datetime().optional(),
  queryRaisedTo: z.string().datetime().optional(),
  respondedFrom: z.string().datetime().optional(),
  respondedTo: z.string().datetime().optional(),
});

export type WoQueriesQueryDto = z.infer<typeof WoQueriesQuerySchema>;
