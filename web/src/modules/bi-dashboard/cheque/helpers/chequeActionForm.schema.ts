import { z } from 'zod';

const ContactPersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

const BaseActionFormSchema = z.object({
    action: z.string().min(1, 'Action is required'),
});

export const ChequeActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form
    cheque_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    cheque_no: z.string().optional(),
    due_date: z.string().optional(),
    receiving_cheque_handed_over: z.any().optional(),
    cheque_images: z.array(z.any()).max(2, 'Maximum 2 cheque images allowed').optional(),
    positive_pay_confirmation: z.any().optional(),
    remarks: z.string().optional(),
    cheque_given_from_account: z.string().optional(),

    // Initiate Followup
    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),
    emailBody: z.string().optional(),

    // Stop the cheque from the bank
    stop_reason_text: z.string().optional(),
    proof_image: z.any().optional(),

    // Paid via Bank Transfer
    transfer_date: z.string().optional(),
    utr: z.string().optional(),
    amount: z.coerce.number().optional(),

    // Deposited in Bank
    reference: z.string().optional(),

    // Cancelled/Torn
    cancelled_image_path: z.any().optional(),
}).refine(
    (data) => {
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
        if (data.action === 'stop-cheque') {
            return !!data.proof_image;
        }
        return true;
    },
    {
        message: 'Proof image is required',
        path: ['proof_image'],
    }
).refine(
    (data) => {
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
        if (data.action === 'accounts-form-1' && data.cheque_req === 'Accepted') {
            return !!data.cheque_no && !!data.receiving_cheque_handed_over &&
                data.cheque_images && data.cheque_images.length > 0;
        }
        return true;
    },
    {
        message: 'Cheque number, receiving cheque handed over, and cheque images are required when accepted',
        path: ['cheque_no'],
    }
).refine(
    (data) => {
        if (data.action === 'deposited-in-bank') {
            return !!data.transfer_date && !!data.reference;
        }
        return true;
    },
    {
        message: 'Transfer date and reference are required',
        path: ['transfer_date'],
    }
).refine(
    (data) => {
        if (data.action === 'cancelled-torn') {
            return !!data.cancelled_image_path;
        }
        return true;
    },
    {
        message: 'Cancelled image is required',
        path: ['cancelled_image_path'],
    }
);

export type ChequeActionFormValues = z.infer<typeof ChequeActionFormSchema>;
