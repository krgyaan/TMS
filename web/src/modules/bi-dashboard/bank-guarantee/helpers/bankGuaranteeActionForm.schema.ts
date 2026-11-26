import { z } from 'zod';

// Contact Person Schema (for follow-up)
const ContactPersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
});

// Bank mail ids are repeatable rows (useFieldArray). A freshly added row starts
// blank, so an empty string has to validate -- otherwise the default row would
// block submit. Same `.or(z.literal(''))` shape as the bgClient* emails below.
const MailRowSchema = z.object({
    email: z.email().optional().or(z.literal('')),
});

// Base schema with common fields
const BaseActionFormSchema = z.object({
    action: z.string().min(1, 'Action is required'),
});

const hasFile = (value: unknown): boolean => {
    if (!value) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.length > 0 : true;
        } catch {
            return true;
        }
    }
    return true;
};

// Charges are required on Stage 3 but 0 is a valid amount, so an empty input
// has to stay `undefined` instead of being coerced to 0 by z.coerce.number().
const optionalCharge = z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().optional(),
);

// Bank Guarantee Action Form Schema
export const BankGuaranteeActionFormSchema = BaseActionFormSchema.extend({
    // Accounts Form (BG) 1 - Request to Bank
    bg_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    approve_bg: z.enum(['Accept the BG given by TE', 'Upload by Imran']).optional(),
    bg_format_imran: z.any().optional(), // File
    prefilled_signed_bg: z.array(z.any()).optional(), // Files
    // FDR % agreed at approval time. Separate from `fdr_per` (step 3).
    bg_approved_fdr_per: z.enum(['10', '15', '100']).optional(),
    bank_mail_ids: z.array(MailRowSchema).optional(),
    bank_mail_ids_cc: z.array(MailRowSchema).optional(),
    authorization_persons: z.array(z.object({
        name: z.string().optional(),
        aadhar_no: z.string().optional(),
    })).optional(),

    // Accounts Form (BG) 2 - After BG Creation
    bg_no: z.string().optional(),
    bg_date: z.string().optional(),
    bg_validity: z.string().optional(),
    bg_claim_period: z.string().optional(),
    bg_upload: z.any().optional(), // File - issued BG document
    bg_signed_covering_letter: z.any().optional(), // File - signed covering letter
    bg2_remark: z.string().optional(),

    // Accounts Form (BG) 3 - Charges & SFMS Confirmation
    sfms_conf: z.any().optional(), // File
    fdr_per: z.enum(['10', '15', '100']).optional(),
    fdr_amt: z.coerce.number().optional(),
    fdr_copy: z.any().optional(), // File
    fdr_no: z.string().optional(),
    fdr_date: z.string().optional(),
    fdr_validity: z.string().optional(),
    fdr_roi: z.coerce.number().optional(),
    bg_charge_deducted: optionalCharge,
    sfms_charge_deducted: optionalCharge,
    stamp_charge_deducted: optionalCharge,
    other_charge_deducted: optionalCharge,

    // Initiate Followup
    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.coerce.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),
    proof_image: z.any().optional(), // File
    attachments: z.array(z.string()).optional(),

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
        // BG request status is required for Accounts Form 1
        if (data.action === 'accounts-form-1') {
            return !!data.bg_req;
        }
        return true;
    },
    {
        message: 'BG Request status is required',
        path: ['bg_req'],
    }
).refine(
    (data) => {
        // Approved BG format is required when request is accepted
        if (data.action === 'accounts-form-1' && data.bg_req === 'Accepted') {
            return !!data.approve_bg;
        }
        return true;
    },
    {
        message: 'Approved BG format is required when request is accepted',
        path: ['approve_bg'],
    }
).refine(
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
            return hasFile(data.bg_format_imran);
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
            return hasFile(data.ext_letter);
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
            return !!data.docket_no && hasFile(data.docket_slip);
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
            return hasFile(data.stamp_covering_letter);
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
            return hasFile(data.cancell_confirm);
        }
        return true;
    },
    {
        message: 'Bank BG cancellation request is required',
        path: ['cancell_confirm'],
    }
).superRefine(
    (data, ctx) => {
        // Accounts Form (BG) 2: BG details plus the issued BG document and the
        // signed covering letter are required. Courier dispatch is captured in
        // the BG create form, so it is no longer validated here.
        if (data.action !== 'accounts-form-2') return;
        if (!data.bg_no) ctx.addIssue({ code: 'custom', message: 'BG number is required', path: ['bg_no'] });
        if (!data.bg_date) ctx.addIssue({ code: 'custom', message: 'BG creation date is required', path: ['bg_date'] });
        if (!data.bg_validity) ctx.addIssue({ code: 'custom', message: 'BG validity is required', path: ['bg_validity'] });
        if (!data.bg_claim_period) ctx.addIssue({ code: 'custom', message: 'BG claim period expiry is required', path: ['bg_claim_period'] });
        if (!hasFile(data.bg_upload)) ctx.addIssue({ code: 'custom', message: 'BG document is required', path: ['bg_upload'] });
        if (!hasFile(data.bg_signed_covering_letter)) {
            ctx.addIssue({ code: 'custom', message: 'Signed covering letter is required', path: ['bg_signed_covering_letter'] });
        }
    }
).refine(
    (data) => {
        if (data.action !== 'accounts-form-1' || data.bg_req !== 'Accepted') return true;
        return !!data.bg_approved_fdr_per
            && typeof data.fdr_amt === 'number'
            && !!data.fdr_no
            && !!data.fdr_date
            && !!data.fdr_validity
            && !!data.fdr_roi
            && hasFile(data.fdr_copy);
    },
    {
        message: 'FDR percentage, FDR value, FDR no., FDR date, FDR validity, FDR ROI and FDR copy are required',
        path: ['fdr_no'],
    }
).refine(
    (data) => {
        // Accounts Form (BG) 3: the SFMS confirmation copy is required once the
        // bank has processed the BG.
        if (data.action !== 'accounts-form-3') return true;
        return hasFile(data.sfms_conf);
    },
    {
        message: 'SFMS confirmation copy is required',
        path: ['sfms_conf'],
    }
).refine(
    (data) => {
        // Accounts Form (BG) 3: all charges must be entered. A value of 0 is
        // valid, so check for a number rather than truthiness.
        if (data.action !== 'accounts-form-3') return true;
        return typeof data.bg_charge_deducted === 'number'
            && typeof data.sfms_charge_deducted === 'number'
            && typeof data.stamp_charge_deducted === 'number';
    },
    {
        message: 'BG charges, SFMS charges and stamp paper charges are required',
        path: ['bg_charge_deducted'],
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
