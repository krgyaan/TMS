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

// Bank Transfer Action Form Schema
export const BankTransferActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (BT) 1 - Request to Bank
    bt_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    payment_datetime: z.string().optional(),
    utr_no: z.string().optional(),
    utr_message: z.string().optional(),
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

    // Returned via Bank Transfer
    transfer_date: z.string().optional(),
}).refine(
    (data) => {
        // Action 1: status is required
        if (data.action === 'accounts-form-1') {
            return !!data.bt_req;
        }
        return true;
    },
    {
        message: 'BT Request status is required',
        path: ['bt_req'],
    }
).refine(
    (data) => {
        if (data.action === 'accounts-form-1' && data.bt_req === 'Rejected') {
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
        // Action 1: When Accepted, payment_datetime, utr_no, utr_message, remarks are required
        if (data.action === 'accounts-form-1' && data.bt_req === 'Accepted') {
            return !!data.payment_datetime && !!data.utr_no && !!data.utr_message && !!data.remarks;
        }
        return true;
    },
    {
        message: 'Date and time of payment, UTR number, UTR message, and remarks are required when accepted',
        path: ['payment_datetime'],
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
        // Action 3: transfer_date and utr_no are required
        if (data.action === 'returned') {
            return !!data.transfer_date && !!data.utr_no;
        }
        return true;
    },
    {
        message: 'Transfer date and UTR number are required',
        path: ['transfer_date'],
    }
);

export type BankTransferActionFormValues = z.infer<typeof BankTransferActionFormSchema>;
