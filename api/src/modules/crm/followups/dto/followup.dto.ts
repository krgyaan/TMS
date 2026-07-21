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
    // Courier fields
    toOrg: z.string().min(1, { message: 'Organization name is required' }),
    toName: z.string().min(1, { message: 'Recipient name is required' }),
    toAddr: z.string().min(1, { message: 'Address is required' }),
    toPin: z.string().min(1, { message: 'Pin code is required' }),
    toMobile: z.string().min(1, { message: 'Mobile number is required' }),
    empFrom: z.number().int().positive({ message: 'Please select an employee' }),
    delDate: z.string().min(1, { message: 'Expected delivery date is required' }),
    urgency: z.number().int().min(1).max(5),
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

export const CreateFollowupSchema = z.discriminatedUnion('type', [
    MailFollowupSchema,
    CallFollowupSchema,
    VisitFollowupSchema,
    LetterFollowupSchema,
    WhatsappFollowupSchema,
]);

export type ContactDto = z.infer<typeof ContactSchema>;
export type MailFollowupDto = z.infer<typeof MailFollowupSchema>;
export type CallFollowupDto = z.infer<typeof CallFollowupSchema>;
export type VisitFollowupDto = z.infer<typeof VisitFollowupSchema>;
export type LetterFollowupDto = z.infer<typeof LetterFollowupSchema>;
export type WhatsappFollowupDto = z.infer<typeof WhatsappFollowupSchema>;
export type CreateFollowupDto = z.infer<typeof CreateFollowupSchema>;