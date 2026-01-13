import { z } from 'zod';

// Contact Person Schema (for follow-up)
const ContactPersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

// Base schema with common fields
const BaseActionFormSchema = z.object({
    action: z.string().min(1, 'Action is required'),
});

// Pay on Portal Action Form Schema
export const PayOnPortalActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (POP) 1 - Request to Portal
    pop_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    utr_no: z.string().optional(),
    portal_name: z.string().optional(),
    amount: z.coerce.number().optional(),
    payment_date: z.string().optional(),
    remarks: z.string().optional(),

    // Initiate Followup
    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),
    proof_image: z.any().optional(), // File

    // Returned
    return_reason: z.string().optional(),
    return_date: z.string().optional(),
    return_remarks: z.string().optional(),

    // Settled
    settlement_date: z.string().optional(),
    settlement_amount: z.coerce.number().optional(),
    settlement_reference_no: z.string().optional(),
}).refine(
    (data) => {
        // Action 1: status is required
        if (data.action === 'accounts-form-1') {
            return !!data.pop_req;
        }
        return true;
    },
    {
        message: 'POP Request status is required',
        path: ['pop_req'],
    }
).refine(
    (data) => {
        if (data.action === 'accounts-form-1' && data.pop_req === 'Rejected') {
            return !!data.reason_req;
        }
        return true;
    },
    {
        message: 'Reason for rejection is required',
        path: ['reason_req'],
    }
).refine(
    (data) => {
        // Action 2: org_name, contacts[].name, contacts[].phone, frequency are required
        if (data.action === 'initiate-followup') {
            if (!data.organisation_name) return false;
            if (!data.contacts || data.contacts.length === 0) return false;
            if (!data.frequency) return false;
            return data.contacts.every(contact => contact.name && contact.phone);
        }
        return true;
    },
    {
        message: 'Organisation name, at least one contact with name and phone, and frequency are required',
        path: ['organisation_name'],
    }
).refine(
    (data) => {
        if (data.action === 'initiate-followup' && data.contacts && data.contacts.length > 0) {
            const invalidContact = data.contacts.find(c => !c.name || !c.phone);
            return !invalidContact;
        }
        return true;
    },
    {
        message: 'Each contact must have a name and phone number',
        path: ['contacts'],
    }
).refine(
    (data) => {
        if (data.action === 'initiate-followup') {
            return !!data.frequency;
        }
        return true;
    },
    {
        message: 'Frequency is required',
        path: ['frequency'],
    }
).refine(
    (data) => {
        // Action 3: return_reason, return_date, utr_no are required
        if (data.action === 'returned') {
            return !!data.return_reason && !!data.return_date && !!data.utr_no;
        }
        return true;
    },
    {
        message: 'Return reason, return date, and UTR number are required',
        path: ['return_reason'],
    }
);

export type PayOnPortalActionFormValues = z.infer<typeof PayOnPortalActionFormSchema>;
