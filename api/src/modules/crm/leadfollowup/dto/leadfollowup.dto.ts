import { z } from 'zod';

// ─── Contact Schema (used in Call/Visit) ──────────────────────────────────────

export const ContactSchema = z.object({
    name: z.string().min(1, { message: 'Contact name is required' }),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

// ─── Mail Follow-up ───────────────────────────────────────────────────────────

export const MailFollowupSchema = z.object({
    type: z.literal('mail'),
    body: z.string().min(1, { message: 'Mail body is required' }),
    subject: z.string().min(1, { message: 'Subject is required' }),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'custom']),
    attachments: z.array(z.string()).default([]),
    nextFollowupDate: z.string().optional().nullable(),
});

// ─── Call Follow-up ───────────────────────────────────────────────────────────

export const CallFollowupSchema = z.object({
    type: z.literal('call'),
    body: z.string().min(1, { message: 'Points discussed is required' }),
    veResponsibility: z.string().optional().nullable(),
    contacts: z.array(ContactSchema).default([]),
    nextFollowupDate: z.string().optional().nullable(),
});

// ─── Visit Follow-up ──────────────────────────────────────────────────────────

export const VisitFollowupSchema = z.object({
    type: z.literal('visit'),
    body: z.string().min(1, { message: 'Points discussed is required' }),
    veResponsibility: z.string().optional().nullable(),
    contacts: z.array(ContactSchema).default([]),
    nextFollowupDate: z.string().optional().nullable(),
});

// ─── Letter Follow-up ─────────────────────────────────────────────────────────

export const LetterFollowupSchema = z.object({
    type: z.literal('letter'),
    courierId: z.number().int().positive().optional(),
    // Courier fields (used when creating a new courier request)
    toOrg: z.string().optional(),
    toName: z.string().optional(),
    toAddr: z.string().optional(),
    toPin: z.string().optional(),
    toMobile: z.string().optional(),
    empFrom: z.number().int().positive().optional(),
    delDate: z.string().optional(),
    urgency: z.number().int().min(1).max(5).optional(),
    attachments: z.array(z.string()).default([]),
    nextFollowupDate: z.string().optional().nullable(),
});

// ─── WhatsApp Follow-up ───────────────────────────────────────────────────────

export const WhatsappFollowupSchema = z.object({
    type: z.literal('whatsapp'),
    body: z.string().min(1, { message: 'Please enter what you sent' }),
    attachments: z.array(z.string()).default([]),
    nextFollowupDate: z.string().optional().nullable(),
});

// ─── Union Schema (discriminated by type) ─────────────────────────────────────

export const CreateFollowupSchema = z
    .discriminatedUnion('type', [
        MailFollowupSchema,
        CallFollowupSchema,
        VisitFollowupSchema,
        LetterFollowupSchema,
        WhatsappFollowupSchema,
    ])
    .superRefine((data, ctx) => {
        if (data.type !== 'letter' || data.courierId) return;

        const addIssue = (path: string, message: string) =>
            ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });

        if (!data.toOrg) addIssue('toOrg', 'Organization name is required');
        if (!data.toName) addIssue('toName', 'Recipient name is required');
        if (!data.toAddr) addIssue('toAddr', 'Address is required');
        if (!data.toPin) addIssue('toPin', 'Pin code is required');
        if (!data.toMobile) addIssue('toMobile', 'Mobile number is required');
        if (!data.empFrom) addIssue('empFrom', 'Please select an employee');
        if (!data.delDate) addIssue('delDate', 'Expected delivery date is required');
        if (!data.urgency) addIssue('urgency', 'Please select urgency');
    });

export type ContactDto = z.infer<typeof ContactSchema>;
export type MailFollowupDto = z.infer<typeof MailFollowupSchema>;
export type CallFollowupDto = z.infer<typeof CallFollowupSchema>;
export type VisitFollowupDto = z.infer<typeof VisitFollowupSchema>;
export type LetterFollowupDto = z.infer<typeof LetterFollowupSchema>;
export type WhatsappFollowupDto = z.infer<typeof WhatsappFollowupSchema>;
export type CreateFollowupDto = z.infer<typeof CreateFollowupSchema>;