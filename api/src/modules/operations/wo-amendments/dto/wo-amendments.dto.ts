import { z } from 'zod';

// ENUMS
export const AmendmentCreatorRoleEnum = z.enum(['OE', 'TE', 'TL']);

export const AmendmentStatusEnum = z.enum([
  'draft',
  'submitted',
  'tl_approved',
  'tl_rejected',
  'communicated',
  'client_acknowledged',
  'resolved',
  'rejected_by_client',
]);

export type AmendmentCreatorRole = z.infer<typeof AmendmentCreatorRoleEnum>;
export type AmendmentStatus = z.infer<typeof AmendmentStatusEnum>;

// CREATE
export const CreateWoAmendmentSchema = z.object({
  woDetailId: z.number().int().positive(),
  createdByRole: AmendmentCreatorRoleEnum,
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
});

export type CreateWoAmendmentDto = z.infer<typeof CreateWoAmendmentSchema>;

// UPDATE

export const UpdateWoAmendmentSchema = z.object({
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
  status: AmendmentStatusEnum.optional(),
});

export type UpdateWoAmendmentDto = z.infer<typeof UpdateWoAmendmentSchema>;

// BULK CREATE
export const CreateBulkWoAmendmentsSchema = z.object({
  woDetailId: z.number().int().positive(),
  createdByRole: AmendmentCreatorRoleEnum,
  amendments: z.array(
    z.object({
      pageNo: z.string().max(100).optional(),
      clauseNo: z.string().max(100).optional(),
      currentStatement: z.string().optional(),
      correctedStatement: z.string().optional(),
    })
  ),
});

export type CreateBulkWoAmendmentsDto = z.infer<typeof CreateBulkWoAmendmentsSchema>;

// TL REVIEW
export const TlReviewAmendmentSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().optional(),
});

export type TlReviewAmendmentDto = z.infer<typeof TlReviewAmendmentSchema>;

// CLIENT RESPONSE
export const RecordClientResponseSchema = z.object({
  response: z.string().min(1, 'Response is required'),
  proof: z.string().optional(),
});

export type RecordClientResponseDto = z.infer<typeof RecordClientResponseSchema>;

// QUERY/FILTERS
export const WoAmendmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50).optional(),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'pageNo', 'clauseNo', 'status'])
    .default('createdAt')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),

  woDetailId: z.coerce.number().int().positive().optional(),
  status: AmendmentStatusEnum.optional(),
  createdByRole: AmendmentCreatorRoleEnum.optional(),
  tlApproved: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  pageNo: z.string().optional(),
  clauseNo: z.string().optional(),
  createdAtFrom: z.string().datetime().optional(),
  createdAtTo: z.string().datetime().optional(),
});

export type WoAmendmentsQueryDto = z.infer<typeof WoAmendmentsQuerySchema>;
