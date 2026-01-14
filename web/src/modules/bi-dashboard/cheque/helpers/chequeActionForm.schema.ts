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

// Cheque Action Form Schema
export const ChequeActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (CHQ) 1 - Request to Bank
    cheque_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    cheque_format_imran: z.any().optional(), // File
    prefilled_signed_cheque: z.array(z.any()).optional(), // Files

    // Accounts Form (CHQ) 2 - After Cheque Creation
    cheque_no: z.string().optional(),
    cheque_date: z.string().optional(),
    cheque_amount: z.coerce.number().optional(),
    cheque_type: z.string().optional(),
    cheque_reason: z.string().optional(),
    due_date: z.string().optional(),
    courier_request_no: z.string().optional(),
    remarks: z.string().optional(),

    // Accounts Form (CHQ) 3 - Capture Cheque Details
    cheque_images: z.array(z.any()).max(2, 'Maximum 2 cheque images allowed').optional(), // Files (max 2)
    cheque_charges: z.coerce.number().optional(),
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

    // Returned via courier
    docket_no: z.string().optional(),
    docket_slip: z.any().optional(), // File

    // Stop the cheque from the bank
    stop_reason_text: z.string().optional(),

    // Paid via Bank Transfer
    transfer_date: z.string().optional(),
    utr: z.string().optional(),
    amount: z.coerce.number().optional(),

    // Deposited in Bank
    bt_transfer_date: z.string().optional(),
    reference: z.string().optional(),

    // Cancelled/Torn
    cancelled_image_path: z.any().optional(), // File

    // Request Cancellation
    covering_letter: z.any().optional(), // File
    cancellation_remarks: z.string().optional(),

    // Cheque Cancellation Confirmation
    cheque_cancellation_date: z.string().optional(),
    cheque_cancellation_amount: z.coerce.number().optional(),
    cheque_cancellation_reference_no: z.string().optional(),
}).refine(
    (data) => {
        // Action 1: status is required
        if (data.action === 'accounts-form-1') {
            return !!data.cheque_req;
        }
        return true;
    },
    {
        message: 'Cheque Request status is required',
        path: ['cheque_req'],
    }
).refine(
    (data) => {
        if (data.action === 'accounts-form-1' && data.cheque_req === 'Rejected') {
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
        // Action 3: stop_reason_text is required
        if (data.action === 'stop-cheque') {
            return !!data.stop_reason_text;
        }
        return true;
    },
    {
        message: 'Stop reason text is required',
        path: ['stop_reason_text'],
    }
).refine(
    (data) => {
        // Action 4: transfer_date, utr, amount are required
        if (data.action === 'paid-via-bank-transfer') {
            return !!data.transfer_date && !!data.utr && data.amount !== undefined && data.amount !== null;
        }
        return true;
    },
    {
        message: 'Transfer date, UTR, and amount are required',
        path: ['transfer_date'],
    }
).refine(
    (data) => {
        // Action 5: bt_transfer_date, reference are required
        if (data.action === 'deposited-in-bank') {
            return !!data.bt_transfer_date && !!data.reference;
        }
        return true;
    },
    {
        message: 'Transfer date and reference are required',
        path: ['bt_transfer_date'],
    }
).refine(
    (data) => {
        // Action 6: cancelled_image_path is required
        if (data.action === 'cancelled-torn') {
            return !!data.cancelled_image_path;
        }
        return true;
    },
    {
        message: 'Cancelled image is required',
        path: ['cancelled_image_path'],
    }
).refine(
    (data) => {
        if (data.action === 'accounts-form-3') {
            return data.cheque_images && data.cheque_images.length <= 2;
        }
        return true;
    },
    {
        message: 'Maximum 2 cheque images allowed',
        path: ['cheque_images'],
    }
);

export type ChequeActionFormValues = z.infer<typeof ChequeActionFormSchema>;
