import { z } from 'zod';

const ContactPersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

const BaseActionFormSchema = z.object({
    action: z.string().min(1, 'Action is required'),
});

export const DemandDraftActionFormSchema = BaseActionFormSchema.extend({
    dd_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    dd_no: z.string().optional(),
    dd_date: z.string().optional(),
    req_no: z.coerce.number().optional(),
    remarks_dd: z.string().optional(),

    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),

    docket_no: z.string().optional(),
    docket_slip: z.string().optional(),

    transfer_date: z.string().optional(),
    utr: z.string().optional(),

    cancellation_date: z.string().optional(),
    cancellation_amount: z.coerce.number().optional(),
    cancellation_reference_no: z.string().optional(),
}).refine(
    (data) => {
        if (data.action === 'accounts-form') {
            return !!data.dd_req;
        }
        return true;
    },
    { message: 'DD Request status is required', path: ['dd_req'] }
).refine(
    (data) => {
        if (data.action === 'accounts-form' && data.dd_req === 'Rejected') {
            return !!data.reason_req;
        }
        return true;
    },
    { message: 'Reason for rejection is required', path: ['reason_req'] }
).refine(
    (data) => {
        if (data.action === 'accounts-form' && data.dd_req === 'Accepted') {
            return !!data.dd_date && !!data.dd_no && !!data.req_no;
        }
        return true;
    },
    { message: 'DD date, DD number, and courier request number are required when accepted', path: ['dd_date'] }
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
    { message: 'Organisation name, at least one contact with name and phone, and frequency are required', path: ['organisation_name'] }
).refine(
    (data) => {
        if (data.action === 'returned-courier') {
            return !!data.docket_no;
        }
        return true;
    },
    { message: 'Docket number is required', path: ['docket_no'] }
).refine(
    (data) => {
        if (data.action === 'returned-bank-transfer') {
            return !!data.transfer_date && !!data.utr;
        }
        return true;
    },
    { message: 'Transfer date and UTR are required', path: ['transfer_date'] }
).refine(
    (data) => {
        if (data.action === 'cancellation-confirmation') {
            return !!data.cancellation_date && !!data.cancellation_amount && !!data.cancellation_reference_no;
        }
        return true;
    },
    { message: 'Cancellation date, amount, and reference number are required', path: ['cancellation_date'] }
);

export type DemandDraftActionFormValues = z.infer<typeof DemandDraftActionFormSchema>;
