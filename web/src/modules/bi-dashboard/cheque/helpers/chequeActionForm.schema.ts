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

    // Request Cancellation
    covering_letter: z.any().optional(), // File
    cancellation_remarks: z.string().optional(),

    // Cheque Cancellation Confirmation
    cheque_cancellation_date: z.string().optional(),
    cheque_cancellation_amount: z.coerce.number().optional(),
    cheque_cancellation_reference_no: z.string().optional(),
}).refine(
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
