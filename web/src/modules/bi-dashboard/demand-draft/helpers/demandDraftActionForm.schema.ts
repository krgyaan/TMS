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

// Demand Draft Action Form Schema
export const DemandDraftActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (DD) 1 - Request to Bank
    dd_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    dd_format_imran: z.any().optional(), // File
    prefilled_signed_dd: z.array(z.any()).optional(), // Files

    // Accounts Form (DD) 2 - After DD Creation
    dd_no: z.string().optional(),
    dd_date: z.string().optional(),
    req_no: z.string().optional(),
    remarks: z.string().optional(),

    // Accounts Form (DD) 3 - Capture DD Details
    dd_amount: z.coerce.number().optional(),
    dd_charges: z.coerce.number().optional(),
    sfms_charges: z.coerce.number().optional(),
    stamp_charges: z.coerce.number().optional(),
    other_charges: z.coerce.number().optional(),

    // Initiate Followup
    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),
    proof_image: z.any().optional(), // File

    // Request Extension
    modification_required: z.enum(['Yes', 'No']).optional(),
    request_letter_email: z.any().optional(), // File
    modification_fields: z.array(z.object({
        field_name: z.string(),
        old_value: z.string(),
        new_value: z.string(),
    })).optional(),

    // Returned via courier
    docket_no: z.string().optional(),
    docket_slip: z.any().optional(), // File

    // Returned via Bank Transfer
    transfer_date: z.string().optional(),
    utr: z.string().optional(),

    // Request Cancellation
    covering_letter: z.any().optional(), // File
    cancellation_remarks: z.string().optional(),

    // DD Cancellation Confirmation
    dd_cancellation_date: z.string().optional(),
    dd_cancellation_amount: z.coerce.number().optional(),
    dd_cancellation_reference_no: z.string().optional(),
}).refine(
    (data) => {
        // Action 1: status is required
        if (data.action === 'accounts-form-1') {
            return !!data.dd_req;
        }
        return true;
    },
    {
        message: 'DD Request status is required',
        path: ['dd_req'],
    }
).refine(
    (data) => {
        if (data.action === 'accounts-form-1' && data.dd_req === 'Rejected') {
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
        // Action 3: docket_no, docket_slip are required
        if (data.action === 'returned-courier') {
            return !!data.docket_no && !!data.docket_slip;
        }
        return true;
    },
    {
        message: 'Docket number and docket slip are required',
        path: ['docket_no'],
    }
).refine(
    (data) => {
        // Action 4: transfer_date, utr are required
        if (data.action === 'returned-bank-transfer') {
            return !!data.transfer_date && !!data.utr;
        }
        return true;
    },
    {
        message: 'Transfer date and UTR are required',
        path: ['transfer_date'],
    }
).refine(
    (data) => {
        // Action 7: date, amount, reference_no are required
        if (data.action === 'dd-cancellation-confirmation') {
            return !!data.dd_cancellation_date && !!data.dd_cancellation_amount && !!data.dd_cancellation_reference_no;
        }
        return true;
    },
    {
        message: 'Cancellation date, amount, and reference number are required',
        path: ['dd_cancellation_date'],
    }
);

export type DemandDraftActionFormValues = z.infer<typeof DemandDraftActionFormSchema>;
