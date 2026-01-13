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

// Bank Guarantee Action Form Schema
export const BankGuaranteeActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (BG) 1 - Request to Bank
    bg_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    approve_bg: z.enum(['Accept the BG given by TE', 'Upload by Imran']).optional(),
    bg_format_imran: z.any().optional(), // File
    prefilled_signed_bg: z.array(z.any()).optional(), // Files

    // Accounts Form (BG) 2 - After BG Creation
    bg_no: z.string().optional(),
    bg_date: z.string().optional(),
    bg_validity: z.string().optional(),
    bg_claim_period: z.string().optional(),
    courier_no: z.string().optional(),
    bg2_remark: z.string().optional(),

    // Accounts Form (BG) 3 - Capture FDR Details
    sfms_conf: z.any().optional(), // File
    fdr_per: z.coerce.number().optional(),
    fdr_amt: z.coerce.number().optional(),
    fdr_copy: z.any().optional(), // File
    fdr_no: z.string().optional(),
    fdr_validity: z.string().optional(),
    fdr_roi: z.coerce.number().optional(),
    bg_charge_deducted: z.coerce.number().optional(),
    sfms_charge_deducted: z.coerce.number().optional(),
    stamp_charge_deducted: z.coerce.number().optional(),
    other_charge_deducted: z.coerce.number().optional(),

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
    ext_letter: z.any().optional(), // File
    new_stamp_charge_deducted: z.coerce.number().optional(),
    new_bg_bank_name: z.string().optional(),
    new_bg_amt: z.coerce.number().optional(),
    new_bg_expiry: z.string().optional(),
    new_bg_claim: z.string().optional(),
    modification_fields: z.array(z.object({
        field_name: z.string(),
        old_value: z.string(),
        new_value: z.string(),
    })).optional(),

    // Returned via courier
    docket_no: z.string().optional(),
    docket_slip: z.any().optional(), // File

    // Request Cancellation
    stamp_covering_letter: z.any().optional(), // File
    cancel_remark: z.string().optional(),

    // BG Cancellation Confirmation
    cancell_confirm: z.any().optional(), // File

    // FDR Cancellation Confirmation
    bg_fdr_cancel_date: z.string().optional(),
    bg_fdr_cancel_amount: z.coerce.number().optional(),
    bg_fdr_cancel_ref_no: z.string().optional(),
}).refine(
    (data) => {
        // Conditional validation: reason_req required when rejected
        if (data.action === 'accounts-form-1' && data.bg_req === 'Rejected') {
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
        // Conditional validation: bg_format_imran required when Upload by Imran
        if (data.action === 'accounts-form-1' && data.approve_bg === 'Upload by Imran') {
            return !!data.bg_format_imran;
        }
        return true;
    },
    {
        message: 'BG format file is required when uploading by Imran',
        path: ['bg_format_imran'],
    }
).refine(
    (data) => {
        // Conditional validation: contacts required for follow-up
        if (data.action === 'initiate-followup') {
            return data.contacts && data.contacts.length > 0;
        }
        return true;
    },
    {
        message: 'At least one contact person is required',
        path: ['contacts'],
    }
).refine(
    (data) => {
        // Conditional validation: stop_reason required when frequency is 6
        if (data.action === 'initiate-followup' && data.frequency === 6) {
            return !!data.stop_reason;
        }
        return true;
    },
    {
        message: 'Stop reason is required when frequency is stopped',
        path: ['stop_reason'],
    }
).refine(
    (data) => {
        // Conditional validation: proof_text required when stop_reason is 2
        if (data.action === 'initiate-followup' && data.stop_reason === 2) {
            return !!data.proof_text;
        }
        return true;
    },
    {
        message: 'Proof details are required when objective is achieved',
        path: ['proof_text'],
    }
).refine(
    (data) => {
        // Action 4: org_name, contacts[].name, contacts[].phone, frequency are required
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
        // Action 5: ext_letter is required
        if (data.action === 'request-extension') {
            return !!data.ext_letter;
        }
        return true;
    },
    {
        message: 'Request letter/email is required',
        path: ['ext_letter'],
    }
).refine(
    (data) => {
        // Action 6: docket_no, docket_slip are required
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
        // Action 7: stamp_covering_letter is required
        if (data.action === 'request-cancellation') {
            return !!data.stamp_covering_letter;
        }
        return true;
    },
    {
        message: 'Signed, stamped covering letter is required',
        path: ['stamp_covering_letter'],
    }
).refine(
    (data) => {
        // Action 8: cancell_confirm is required
        if (data.action === 'bg-cancellation-confirmation') {
            return !!data.cancell_confirm;
        }
        return true;
    },
    {
        message: 'Bank BG cancellation request is required',
        path: ['cancell_confirm'],
    }
).refine(
    (data) => {
        // Action 9: bg_fdr_cancel_date, bg_fdr_cancel_amount, bg_fdr_cancel_ref_no are required
        if (data.action === 'fdr-cancellation-confirmation') {
            return !!data.bg_fdr_cancel_date && !!data.bg_fdr_cancel_amount && !!data.bg_fdr_cancel_ref_no;
        }
        return true;
    },
    {
        message: 'FDR cancellation date, amount, and reference number are required',
        path: ['bg_fdr_cancel_date'],
    }
);

export type BankGuaranteeActionFormValues = z.infer<typeof BankGuaranteeActionFormSchema>;
