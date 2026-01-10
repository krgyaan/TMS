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
    utr_no: z.string().optional(),
    account_name: z.string().optional(),
    account_no: z.string().optional(),
    ifsc_code: z.string().optional(),
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

export type BankTransferActionFormValues = z.infer<typeof BankTransferActionFormSchema>;
