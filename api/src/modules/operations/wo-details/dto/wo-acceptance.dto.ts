import { z } from 'zod';

export const WoAmendmentItemSchema = z.object({
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
});

export type WoAmendmentItem = z.infer<typeof WoAmendmentItemSchema>;

export const WoAcceptanceDecisionSchema = z.object({
  decision: z.enum(['accepted', 'amendment_needed']),
  remarks: z.string().optional(),

  // If amendment_needed
  amendments: z.array(WoAmendmentItemSchema).optional(),
  initiateFollowUp: z.boolean().optional(),

  // If accepted
  oeSiteVisitId: z.number().int().positive().nullable().optional(),
  oeDocsPrepId: z.number().int().positive().nullable().optional(),
  signedWoFilePath: z.string().max(500).nullable().optional(),
});

export type WoAcceptanceDecisionDto = z.infer<typeof WoAcceptanceDecisionSchema>;

export const WoAcceptanceResponseSchema = z.object({
  id: z.number().int().positive(),
  woDetailId: z.number().int().positive(),
  status: z.string(),
  decision: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  isCompleted: z.boolean(),
});

export type WoAcceptanceResponseDto = z.infer<typeof WoAcceptanceResponseSchema>;
