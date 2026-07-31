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

export const CreateFollowupContactSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

export const CreateFollowupSchema = z.object({
    organisation_name: z.string().min(1, 'Organisation name is required'),
    contacts: z.array(CreateFollowupContactSchema).min(1, 'At least one contact is required'),
    followup_start_date: z.string().optional(),
    frequency: z.coerce.number().int().min(1).max(8).optional(),
    emailBody: z.string().optional(),
    attachments: z.array(z.string()).optional().default([]),
});

export type CreateFollowupDto = z.infer<typeof CreateFollowupSchema>;
