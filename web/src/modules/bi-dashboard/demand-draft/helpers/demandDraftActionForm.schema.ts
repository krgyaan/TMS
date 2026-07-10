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
    remarks_dd: z.string().optional(),

    // Courier dispatch fields (creates courier record, stores its ID in req_no)
    courierOrg: z.string().optional(),
    courierName: z.string().optional(),
    courierPhone: z.string().optional(),
    courierAddrLine1: z.string().optional(),
    courierAddrLine2: z.string().optional(),
    courierCity: z.string().optional(),
    courierState: z.string().optional(),
    courierPincode: z.string().optional(),
    empFrom: z.coerce.number().optional(),
    delDate: z.string().optional(),
    urgency: z.coerce.number().optional(),

    organisation_name: z.string().optional(),
    contacts: z.array(ContactPersonSchema).optional(),
    followup_start_date: z.string().optional(),
    frequency: z.number().int().min(1).max(6).optional(),
    emailBody: z.string().optional(),
    docket_no: z.string().optional(),
    docket_slip: z.string().optional(),

    transfer_date: z.string().optional(),
    utr: z.string().optional(),

    cancellation_date: z.string().optional(),
    cancellation_amount: z.coerce.number().optional(),
    cancellation_reference_no: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.action === 'accounts-form') {
        if (!data.dd_req) {
            ctx.addIssue({ code: 'custom', message: 'DD Request status is required', path: ['dd_req'] });
            return;
        }
        if (data.dd_req === 'Rejected' && !data.reason_req) {
            ctx.addIssue({ code: 'custom', message: 'Reason for rejection is required', path: ['reason_req'] });
            return;
        }
        if (data.dd_req === 'Accepted') {
            if (!data.dd_date) ctx.addIssue({ code: 'custom', message: 'DD date is required', path: ['dd_date'] });
            if (!data.dd_no) ctx.addIssue({ code: 'custom', message: 'DD number is required', path: ['dd_no'] });
            if (!data.courierOrg) ctx.addIssue({ code: 'custom', message: 'Organization name is required', path: ['courierOrg'] });
            if (!data.courierName) ctx.addIssue({ code: 'custom', message: 'Recipient name is required', path: ['courierName'] });
            if (!data.courierPhone) ctx.addIssue({ code: 'custom', message: 'Phone is required', path: ['courierPhone'] });
            if (!data.courierAddrLine1) ctx.addIssue({ code: 'custom', message: 'Address line 1 is required', path: ['courierAddrLine1'] });
            if (!data.courierPincode) {
                ctx.addIssue({ code: 'custom', message: 'Pin code is required', path: ['courierPincode'] });
            } else if (!/^\d{6}$/.test(data.courierPincode)) {
                ctx.addIssue({ code: 'custom', message: 'Pin code must be 6 digits', path: ['courierPincode'] });
            }
            if (!data.empFrom) ctx.addIssue({ code: 'custom', message: 'Courier from employee is required', path: ['empFrom'] });
            if (!data.delDate) ctx.addIssue({ code: 'custom', message: 'Delivery date is required', path: ['delDate'] });
            if (!data.urgency) ctx.addIssue({ code: 'custom', message: 'Dispatch urgency is required', path: ['urgency'] });
        }
    }

    if (data.action === 'initiate-followup') {
        if (!data.organisation_name) ctx.addIssue({ code: 'custom', message: 'Organisation name is required', path: ['organisation_name'] });
        if (!data.contacts || data.contacts.length === 0) {
            ctx.addIssue({ code: 'custom', message: 'At least one contact is required', path: ['contacts'] });
        } else {
            data.contacts.forEach((contact, index) => {
                if (!contact.name) ctx.addIssue({ code: 'custom', message: 'Contact name is required', path: ['contacts', index, 'name'] });
                if (!contact.phone) ctx.addIssue({ code: 'custom', message: 'Contact phone is required', path: ['contacts', index, 'phone'] });
            });
        }
        if (!data.frequency) ctx.addIssue({ code: 'custom', message: 'Follow-up frequency is required', path: ['frequency'] });
    }

    if (data.action === 'returned-courier' && !data.docket_no) {
        ctx.addIssue({ code: 'custom', message: 'Docket number is required', path: ['docket_no'] });
    }

    if (data.action === 'returned-bank-transfer') {
        if (!data.transfer_date) ctx.addIssue({ code: 'custom', message: 'Transfer date is required', path: ['transfer_date'] });
        if (!data.utr) ctx.addIssue({ code: 'custom', message: 'UTR number is required', path: ['utr'] });
    }

    if (data.action === 'cancellation-confirmation') {
        if (!data.cancellation_date) ctx.addIssue({ code: 'custom', message: 'Cancellation date is required', path: ['cancellation_date'] });
        if (!data.cancellation_amount) ctx.addIssue({ code: 'custom', message: 'Cancellation amount is required', path: ['cancellation_amount'] });
        if (!data.cancellation_reference_no) ctx.addIssue({ code: 'custom', message: 'Bank reference number is required', path: ['cancellation_reference_no'] });
    }
});

export type DemandDraftActionFormValues = z.infer<typeof DemandDraftActionFormSchema>;
