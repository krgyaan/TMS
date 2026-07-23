import { z } from 'zod';

export const CreateLeadEnquirySchema = z.object({
    leadId: z.number().int().positive().optional().nullable(),
    team: z.string().max(29).optional().nullable(),
    enqName: z.string().min(1, { message: 'Enquiry name is required' }).max(255),
    organisationId: z.number().int().positive().optional().nullable(),
    itemId: z.number().int().positive({ message: 'Item is required' }),
    locationCode: z.string().min(1, { message: 'Location code is required' }).max(255),
    approxValue: z.string().min(1, { message: 'Approx value is required' }),
    siteVisitRequired: z.boolean().optional().default(false),
    orgAbbName: z.string().max(50).optional().nullable(),
    enquiryFile: z.string().optional().nullable(),
    enquiryPhotos: z.string().optional().nullable(),
    organizationName: z.string().min(1, { message: 'Organization name is required' }).max(255),
    enquiryNumber: z.string().max(255).optional().nullable(),
    rejectionReason: z.string().max(255).optional().nullable(),
    status: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const UpdateLeadEnquirySchema = z.object({
    leadId: z.number().int().positive().optional().nullable(),
    team: z.string().max(29).optional().nullable(),
    enqName: z.string().min(1).max(255).optional(),
    organisationId: z.number().int().positive().optional().nullable(),
    itemId: z.number().int().positive().optional(),
    locationCode: z.string().min(1).max(255).optional(),
    approxValue: z.string().min(1).optional(),
    siteVisitRequired: z.boolean().optional(),
    orgAbbName: z.string().max(50).optional().nullable(),
    enquiryFile: z.string().optional().nullable(),
    enquiryPhotos: z.string().optional().nullable(),
    organizationName: z.string().max(255).optional().nullable(),
    enquiryNumber: z.string().max(255).optional().nullable(),
    rejectionReason: z.string().max(255).optional().nullable(),
    status: z.string().max(50).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export type CreateLeadEnquiryDto = z.infer<typeof CreateLeadEnquirySchema>;
export type UpdateLeadEnquiryDto = z.infer<typeof UpdateLeadEnquirySchema>;

export const CreateSiteVisitSchema = z.object({
    enquiryId: z.number().int().positive(),
    assignedTo: z.number().int().positive().optional().nullable(),
    scheduledAt: z.string().optional().nullable(),
    information: z.string().optional().nullable(),
    additionalNotes: z.string().optional().nullable(),
    documents: z.string().optional().nullable(),
});

export const UpdateSiteVisitSchema = z.object({
    assignedTo: z.number().int().positive().optional().nullable(),
    scheduledAt: z.string().optional().nullable(),
    conductedAt: z.string().optional().nullable(),
    information: z.string().optional().nullable(),
    additionalNotes: z.string().optional().nullable(),
    documents: z.string().optional().nullable(),
    status: z.string().max(50).optional(),
});

export type CreateSiteVisitDto = z.infer<typeof CreateSiteVisitSchema>;
export type UpdateSiteVisitDto = z.infer<typeof UpdateSiteVisitSchema>;
