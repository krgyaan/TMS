import { z } from 'zod';

export const CreateLeadSchema = z.object({
    companyName: z.string().min(1, { message: 'Company name is required' }),
    name: z.string().min(1, { message: 'Person name is required' }),
    designation: z.string().min(1, { message: 'Designation is required' }),
    phone: z.string().min(1, { message: 'Phone is required' }),
    email: z.string().email({ message: 'A valid email is required' }),
    address: z.string().min(1, { message: 'Address is required' }),
    country: z.string().min(1, { message: 'Country is required' }),
    state: z.string().min(1, { message: 'State is required' }),
    type: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    team: z.string().optional().nullable(),
    bdPerson: z.number().int().optional().nullable(),
    allocatedTe: z.number().int().optional().nullable(),
    allocationNotes: z.string().max(2000).optional().nullable(),      // ← NEW
    pointsDiscussed: z.string().max(2000).optional().nullable(),
    veResponsibility: z.string().max(2000).optional().nullable(),
    leadPriority: z.string().optional().nullable(),
    recentFollowUp: z.enum(['visit', 'whatsapp', 'letter', 'mail', 'call']).optional().nullable(),
    enquiryReceivedAt: z.string().optional().nullable(),
    lastMailSentAt: z.string().optional().nullable(),
    lastCallAt: z.string().optional().nullable(),
    lastVisitAt: z.string().optional().nullable(),
    lastLetterSentAt: z.string().optional().nullable(),
    lastWhatsappSentAt: z.string().optional().nullable(),
    mailFollowupCount: z.number().int().default(0),
    callFollowupCount: z.number().int().default(0),
    visitFollowupCount: z.number().int().default(0),
    letterSentCount: z.number().int().default(0),
    whatsappFollowupCount: z.number().int().default(0),
});

export const UpdateLeadSchema = z.object({
    companyName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    designation: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    address: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    type: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    team: z.string().optional().nullable(),
    bdPerson: z.number().int().optional().nullable(),
    allocatedTe: z.number().int().optional().nullable(),
    allocationNotes: z.string().max(2000).optional().nullable(),      // ← NEW
    pointsDiscussed: z.string().max(2000).optional().nullable(),
    veResponsibility: z.string().max(2000).optional().nullable(),
    leadPriority: z.enum(['Cold', 'Warm', 'Hot']).optional().nullable(),
    recentFollowUp: z.enum(['visit', 'whatsapp', 'letter', 'mail', 'call']).optional().nullable(),
});

// ← NEW
export const AllocateLeadSchema = z.object({
    allocatedTe: z.number({
        required_error: 'Technical Executive is required',
        invalid_type_error: 'Technical Executive must be a number',
    }).int().positive({ message: 'Please select a valid Technical Executive' }),
    allocationNotes: z.string().max(2000).optional().nullable(),
});

export type CreateLeadDto = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadDto = z.infer<typeof UpdateLeadSchema>;
export type AllocateLeadDto = z.infer<typeof AllocateLeadSchema>;   