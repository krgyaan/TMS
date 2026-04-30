import { z } from 'zod';

export const PhysicalDocsFormSchema = z.object({
    tenderId: z.number().min(1, 'Tender ID is required'),
    isCourierRequested: z.enum(['yes', 'no']),
    courierNo: z.coerce.number().optional(),
    // Courier Request Fields (used if isCourierRequested is 'no')
    toOrg: z.string().optional(),
    toName: z.string().optional(),
    toAddr: z.string().optional(),
    toPin: z.string().optional(),
    toMobile: z.string().optional(),
    empFrom: z.coerce.number().optional(),
    delDate: z.string().optional(),
    urgency: z.coerce.number().optional(),
    
    submittedDocs: z.array(z.string()).min(1, 'At least one document must be selected'),
    physicalDocsPersons: z.array(z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.email('Invalid email address').or(z.literal('')),
        phone: z.string().min(10, 'Phone number must be at least 10 digits').or(z.literal('')),
    })).min(1, 'At least one person must be added'),
}).superRefine((data, ctx) => {
    if (data.isCourierRequested === 'yes') {
        if (!data.courierNo || data.courierNo <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Courier number is required',
                path: ['courierNo'],
            });
        }
    } else {
        // Validate courier request fields
        if (!data.toOrg) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Organization is required', path: ['toOrg'] });
        if (!data.toName) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Recipient name is required', path: ['toName'] });
        if (!data.toAddr) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Address is required', path: ['toAddr'] });
        if (!data.toPin) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pin code is required', path: ['toPin'] });
        else if (!/^\d{6}$/.test(data.toPin)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pin code must be 6 digits', path: ['toPin'] });
        
        if (!data.toMobile) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mobile number is required', path: ['toMobile'] });
        else if (!/^\d{10}$/.test(data.toMobile)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mobile number must be 10 digits', path: ['toMobile'] });
        
        if (!data.empFrom) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Employee is required', path: ['empFrom'] });
        if (!data.delDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Delivery date is required', path: ['delDate'] });
        if (!data.urgency) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Urgency is required', path: ['urgency'] });
    }
});

export type PhysicalDocsFormValues = z.infer<typeof PhysicalDocsFormSchema>;
