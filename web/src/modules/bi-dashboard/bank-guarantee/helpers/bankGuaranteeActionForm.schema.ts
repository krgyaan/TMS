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
    courier_request_no: z.string().optional(),
    remarks: z.string().optional(),

    // Accounts Form (BG) 3 - Capture FDR Details
    sfms_confirmation: z.any().optional(), // File
    fdr_percentage: z.coerce.number().optional(),
    fdr_amount: z.coerce.number().optional(),
    fdr_no: z.string().optional(),
    fdr_validity: z.string().optional(),
    fdr_roi: z.coerce.number().optional(),
    bg_charges: z.coerce.number().optional(),
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

    // Request Cancellation
    covering_letter: z.any().optional(), // File
    cancellation_remarks: z.string().optional(),

    // BG Cancellation Confirmation
    bank_bg_cancellation_request: z.any().optional(), // File

    // FDR Cancellation Confirmation
    fdr_cancellation_date: z.string().optional(),
    fdr_cancellation_amount: z.coerce.number().optional(),
    fdr_cancellation_reference_no: z.string().optional(),
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
        // Conditional validation: modification_fields required when modification_required is Yes
        if (data.action === 'request-extension' && data.modification_required === 'Yes') {
            return data.modification_fields && data.modification_fields.length > 0;
        }
        return true;
    },
    {
        message: 'Modification fields are required when modification is required',
        path: ['modification_fields'],
    }
);

export type BankGuaranteeActionFormValues = z.infer<typeof BankGuaranteeActionFormSchema>;
