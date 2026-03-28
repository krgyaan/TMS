import { z } from 'zod';

export const WoAmendmentItemSchema = z.object({
  pageNo: z.string().max(100).optional(),
  clauseNo: z.string().max(100).optional(),
  currentStatement: z.string().optional(),
  correctedStatement: z.string().optional(),
});

export const WoAcceptanceFormSchema = z.object({
  decision: z.enum(['accepted', 'amendment_needed']),
  remarks: z.string().optional(),
  
  // If amendment_needed
  amendments: z.array(WoAmendmentItemSchema).optional(),
  initiateFollowUp: z.string().optional(),
  
  // If accepted
  oeSiteVisitId: z.string().nullable().optional(), // Using string for Select compatibility, conversion to number in submit
  oeDocsPrepId: z.string().nullable().optional(),
  signedWoFilePath: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.decision === 'amendment_needed') {
    if (!data.amendments || data.amendments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one amendment is required',
        path: ['amendments'],
      });
    }
  }
  
  if (data.decision === 'accepted') {
    if (!data.signedWoFilePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Signed WO file is required for acceptance',
        path: ['signedWoFilePath'],
      });
    }
  }
});
