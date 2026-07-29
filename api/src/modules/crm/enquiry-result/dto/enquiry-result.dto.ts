import { z } from 'zod';

export const CreateEnquiryResultSchema = z.object({
    enquiryId: z.number().int().positive(),
    technicallyQualified: z.boolean().optional().nullable(),
    disqualificationReason: z.string().optional().nullable(),
    qualifiedCount: z.number().int().positive().optional().nullable(),
    qualifiedParties: z.array(z.string()).optional().nullable(),
    result: z.enum(['won', 'lost']).optional().nullable(),
    l1Price: z.number().positive().optional().nullable(),
    l2Price: z.number().positive().optional().nullable(),
    ourPrice: z.number().positive().optional().nullable(),
    uploadScreenshot: z.string().optional().nullable(),
    uploadDocuments: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
});

export type CreateEnquiryResultDto = z.infer<typeof CreateEnquiryResultSchema>;

export const UpdateEnquiryResultSchema = z.object({
    technicallyQualified: z.boolean().optional().nullable(),
    disqualificationReason: z.string().optional().nullable(),
    qualifiedCount: z.number().int().positive().optional().nullable(),
    qualifiedParties: z.array(z.string()).optional().nullable(),
    result: z.enum(['won', 'lost']).optional().nullable(),
    l1Price: z.number().positive().optional().nullable(),
    l2Price: z.number().positive().optional().nullable(),
    ourPrice: z.number().positive().optional().nullable(),
    uploadScreenshot: z.string().optional().nullable(),
    uploadDocuments: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
});

export type UpdateEnquiryResultDto = z.infer<typeof UpdateEnquiryResultSchema>;

export const EnquiryResultListSchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(50),
    search: z.string().optional(),
    enquiryId: z.coerce.number().int().positive().optional(),
    status: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type EnquiryResultListDto = z.infer<typeof EnquiryResultListSchema>;
