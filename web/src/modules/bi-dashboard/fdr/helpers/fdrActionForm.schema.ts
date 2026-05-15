import { z } from 'zod';

const ContactPersonSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
});

const BaseActionFormSchema = z.object({
    action: z.string().min(1, 'Action is required'),
});

export const FdrActionFormSchema = BaseActionFormSchema.extend({
    fdr_req: z.enum(['Accepted', 'Rejected']).optional(),
    reason_req: z.string().optional(),
    fdr_no: z.string().optional(),
    fdr_date: z.string().optional(),
    req_no: z.string().optional(),
    remarks_fdr: z.string().optional(),

    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    emailBody: z.string().optional(),
    stop_reason: z.number().int().min(1).max(4).optional().nullable(),
    proof_text: z.string().optional().nullable(),
    stop_remarks: z.string().optional().nullable(),

    docket_no: z.string().optional(),
    docket_slip: z.string().optional(),

    transfer_date: z.string().optional(),
    utr: z.string().optional(),

    covering_letter: z.string().optional(),
    req_receive: z.string().optional(),

    cancellation_date: z.string().optional(),
    cancellation_amount: z.coerce.number().optional(),
    cancellation_reference_no: z.string().optional(),
}).refine(
    (data) => {
        if (data.action === 'accounts-form') {
            return !!data.fdr_req;
        }
        return true;
    },
    { message: 'FDR Request status is required', path: ['fdr_req'] }
).refine(
    (data) => {
        if (data.action === 'accounts-form' && data.fdr_req === 'Rejected') {
            return !!data.reason_req;
        }
        return true;
    },
    { message: 'Reason for rejection is required', path: ['reason_req'] }
).refine(
    (data) => {
        if (data.action === 'accounts-form' && data.fdr_req === 'Accepted') {
            return !!data.fdr_date && !!data.fdr_no && !!data.req_no;
        }
        return true;
    },
    { message: 'FDR date, FDR number, and courier request number are required when accepted', path: ['fdr_date'] }
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
        if (data.action === 'request-cancellation') {
            return !!data.covering_letter && !!data.req_receive;
        }
        return true;
    },
    { message: 'Covering letter and bank cancellation request are required', path: ['covering_letter'] }
).refine(
    (data) => {
        if (data.action === 'cancellation-confirmation') {
            return !!data.cancellation_date && !!data.cancellation_amount && !!data.cancellation_reference_no;
        }
        return true;
    },
    { message: 'Cancellation date, amount, and reference number are required', path: ['cancellation_date'] }
);

export type FdrActionFormValues = z.infer<typeof FdrActionFormSchema>;
