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
    courier_request_no: z.string().optional(),
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

    // Request Cancellation
    covering_letter: z.any().optional(), // File
    cancellation_remarks: z.string().optional(),

    // DD Cancellation Confirmation
    dd_cancellation_date: z.string().optional(),
    dd_cancellation_amount: z.coerce.number().optional(),
    dd_cancellation_reference_no: z.string().optional(),
}).refine(
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
        if (data.action === 'initiate-followup') {
            return data.contacts && data.contacts.length > 0;
        }
        return true;
    },
    {
        message: 'At least one contact person is required',
        path: ['contacts'],
    }
);

export type DemandDraftActionFormValues = z.infer<typeof DemandDraftActionFormSchema>;
