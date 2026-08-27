import { z } from 'zod';

export const EnquiryContactSchema = z.object({
    name: z.string().min(1, { message: 'Contact name is required' }).max(255),
    designation: z.string().max(255).optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    email: z.string().max(255).optional().nullable(),
});

export type EnquiryContactDto = z.infer<typeof EnquiryContactSchema>;

export const CreateLeadEnquirySchema = z.object({
    leadId: z.number().int().positive().optional().nullable(),
    happyCallingId: z.number().int().positive().optional().nullable(),
    team: z.string().max(29).optional().nullable(),
    enqName: z.string().min(1, { message: 'Enquiry name is required' }).max(255),
    organisationId: z.number().int().positive().optional().nullable(),
    itemId: z.number().int().positive({ message: 'Item is required' }),
    locationCode: z.string().min(1, { message: 'Location code is required' }).max(255),
    approxValue: z.string().min(1, { message: 'Approx value is required' }),
    dueDate: z.string().optional().nullable(),
    siteVisitRequired: z.boolean().optional().default(false),
    orgAbbName: z.string().max(50).optional().nullable(),
    enquiryFile: z.string().optional().nullable(),
    enquiryPhotos: z.string().optional().nullable(),
    organizationName: z.string().min(1, { message: 'Organization name is required' }).max(255),
    enquiryNumber: z.string().max(255).optional().nullable(),
    rejectionReason: z.string().max(255).optional().nullable(),
    status: z.string().max(50).optional().nullable(),
    enquiryType: z.string().max(50).optional().nullable(),
    costingDocument: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
    contacts: z.array(EnquiryContactSchema).optional().nullable(),
});

export const CreateEnquiryWithLeadSchema = z.object({
    team: z.string().max(29).optional().nullable(),
    enqName: z.string().min(1, { message: 'Enquiry name is required' }).max(255),
    organisationId: z.number().int().positive().optional().nullable(),
    itemId: z.number().int().positive({ message: 'Item is required' }),
    locationCode: z.string().min(1, { message: 'Location code is required' }).max(255),
    approxValue: z.string().min(1, { message: 'Approx value is required' }),
    dueDate: z.string().optional().nullable(),
    siteVisitRequired: z.boolean().optional().default(false),
    orgAbbName: z.string().max(50).optional().nullable(),
    enquiryFile: z.string().optional().nullable(),
    enquiryPhotos: z.string().optional().nullable(),
    organizationName: z.string().min(1, { message: 'Organization name is required' }).max(255),
    enquiryNumber: z.string().max(255).optional().nullable(),
    rejectionReason: z.string().max(255).optional().nullable(),
    status: z.string().max(50).optional().nullable(),
    enquiryType: z.string().max(50).optional().nullable(),
    costingDocument: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
    contacts: z.array(EnquiryContactSchema).min(1, { message: 'At least one contact person is required' }),
    address: z.string().max(255).optional().nullable(),
    country: z.string().max(255).optional().nullable(),
    state: z.string().max(255).optional().nullable(),
});

export type CreateEnquiryWithLeadDto = z.infer<typeof CreateEnquiryWithLeadSchema>;

export const UpdateLeadEnquirySchema = z.object({
    leadId: z.number().int().positive().optional().nullable(),
    happyCallingId: z.number().int().positive().optional().nullable(),
    team: z.string().max(29).optional().nullable(),
    enqName: z.string().min(1).max(255).optional(),
    organisationId: z.number().int().positive().optional().nullable(),
    itemId: z.number().int().positive().optional(),
    locationCode: z.string().min(1).max(255).optional(),
    approxValue: z.string().min(1).optional(),
    dueDate: z.string().optional().nullable(),
    siteVisitRequired: z.boolean().optional(),
    orgAbbName: z.string().max(50).optional().nullable(),
    enquiryFile: z.string().optional().nullable(),
    enquiryPhotos: z.string().optional().nullable(),
    organizationName: z.string().max(255).optional().nullable(),
    enquiryNumber: z.string().max(255).optional().nullable(),
    rejectionReason: z.string().max(255).optional().nullable(),
    status: z.string().max(50).optional().nullable(),
    enquiryType: z.string().max(50).optional().nullable(),
    costingDocument: z.string().max(500).optional().nullable(),
    notes: z.string().optional().nullable(),
    contacts: z.array(EnquiryContactSchema).optional().nullable(),
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

export const UpdateSiteVisitDetailsSchema = z.object({
    information: z.string().optional().nullable(),
    documents: z.string().optional().nullable(),
    conductedAt: z.string().optional().nullable(),
});

export type UpdateSiteVisitDetailsDto = z.infer<typeof UpdateSiteVisitDetailsSchema>;

export const CreateSiteVisitContactSchema = z.object({
    siteVisitId: z.number().int().positive(),
    name: z.string().min(1, 'Contact name is required').max(255),
    designation: z.string().max(255).optional().nullable(),
    phone: z.string().max(255).optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
});

export type CreateSiteVisitContactDto = z.infer<typeof CreateSiteVisitContactSchema>;

export const CreateSiteVisitContactArraySchema = z.object({
    siteVisitId: z.number().int().positive(),
    contacts: z.array(CreateSiteVisitContactSchema.omit({ siteVisitId: true })),
});

export type CreateSiteVisitContactArrayDto = z.infer<typeof CreateSiteVisitContactArraySchema>;
