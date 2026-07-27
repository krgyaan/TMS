import { z } from 'zod';

export const CreatePrivateQuoteSchema = z.object({
    enquiryId: z.number().int().positive(),
    status: z.string().default('Submission Pending'),
});

export type CreatePrivateQuoteDto = z.infer<typeof CreatePrivateQuoteSchema>;

export const UpdatePrivateQuoteSchema = z.object({
    quoteSubmissionDatetime: z.string().datetime().optional().nullable(),
    submittedDocuments: z.string().optional().nullable(),
    contacts: z.string().optional().nullable(),
    missedReason: z.string().optional().nullable(),
    oemName: z.string().optional().nullable(),
    preventRepeat: z.number().int().min(0).max(1).optional().nullable(),
    tmsImprovement: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
});

export type UpdatePrivateQuoteDto = z.infer<typeof UpdatePrivateQuoteSchema>;

export const PrivateQuoteListSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(50),
    search: z.string().optional(),
    status: z.string().optional(),
    enquiryId: z.coerce.number().int().positive().optional(),
});

export type PrivateQuoteListDto = z.infer<typeof PrivateQuoteListSchema>;
