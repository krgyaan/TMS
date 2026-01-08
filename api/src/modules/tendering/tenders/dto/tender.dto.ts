import { z } from 'zod';
import {
    optionalString,
    optionalTextField,
    bigintField,
    textField,
    dateField,
    requiredDateField,
    decimalField,
} from '@/utils/zod-schema-generator';

/**
 * Create Tender Schema - Enhanced version based on tenders.schema.ts
 */
export const CreateTenderSchema = z.object({
    team: bigintField().positive('Team is required'),
    tenderNo: textField(255).min(1, 'Tender number is required'),
    organization: bigintField().positive().optional(),
    tenderName: textField(255).min(1, 'Tender name is required'),
    item: bigintField().positive('Item is required'),
    gstValues: z.string().default('0').transform((val) => {
        const num = Number(val);
        return isNaN(num) || num < 0 ? '0' : val;
    }),
    tenderFees: z.string().default('0').transform((val) => {
        const num = Number(val);
        return isNaN(num) || num < 0 ? '0' : val;
    }),
    emd: z.string().default('0').transform((val) => {
        const num = Number(val);
        return isNaN(num) || num < 0 ? '0' : val;
    }),
    teamMember: bigintField().positive().nullable().optional(),
    dueDate: requiredDateField,
    location: bigintField().positive().optional(),
    website: bigintField().positive().optional(),
    status: z.coerce.number().int().min(0, 'Invalid status').default(1),
    remarks: optionalTextField(200),
    deleteStatus: z.coerce.number().int().min(0, 'Invalid delete status').default(0).optional(),
    tlStatus: z.coerce.number().int().min(0, 'Invalid TL status').default(0).optional(),
    tlRemarks: optionalTextField(200),
    rfqTo: optionalTextField(15),
    courierAddress: optionalString,
    documents: z.string().nullable().optional(),
});

export type CreateTenderDto = z.infer<typeof CreateTenderSchema>;

/**
 * Update Tender Schema - Enhanced version
 */
export const UpdateTenderSchema = z.object({
    team: bigintField().positive('Team is required').optional(),
    tenderNo: textField(255).min(1, 'Tender number is required').optional(),
    organization: bigintField().positive().optional(),
    tenderName: textField(255).min(1, 'Tender name is required').optional(),
    item: bigintField().positive('Item is required').optional(),
    gstValues: z.string().transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        return isNaN(num) || num < 0 ? undefined : val;
    }).optional(),
    tenderFees: z.string().transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        return isNaN(num) || num < 0 ? undefined : val;
    }).optional(),
    emd: z.string().transform((val) => {
        if (!val) return undefined;
        const num = Number(val);
        return isNaN(num) || num < 0 ? undefined : val;
    }).optional(),
    teamMember: bigintField().positive().nullable().optional(),
    dueDate: dateField,
    location: bigintField().positive().optional(),
    website: bigintField().positive().optional(),
    status: z.coerce.number().int().min(0, 'Invalid status').optional(),
    remarks: optionalTextField(200),
    deleteStatus: z.coerce.number().int().min(0, 'Invalid delete status').default(0).optional(),
    tlStatus: z.coerce.number().int().min(0, 'Invalid TL status').default(0).optional(),
    tlRemarks: optionalTextField(200),
    rfqTo: optionalTextField(15),
    courierAddress: optionalString,
    tenderFeeMode: optionalTextField(50),
    emdMode: optionalTextField(50),
    approvePqrSelection: optionalTextField(50),
    approveFinanceDocSelection: optionalTextField(50),
    tenderApprovalStatus: optionalTextField(50),
    oemNotAllowed: optionalString,
    tlRejectionRemarks: optionalString,
    documents: z.string().nullable().optional(),
});

export type UpdateTenderDto = z.infer<typeof UpdateTenderSchema>;

/**
 * Update Status Schema - Move from controller
 */
export const UpdateStatusSchema = z.object({
    status: z.coerce.number().int().positive('Status must be a positive number'),
    comment: textField().min(1, 'Comment is required'),
});

export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;

/**
 * Generate Tender Name Schema - Move from controller
 */
export const GenerateTenderNameSchema = z.object({
    organization: bigintField().positive('Organization is required'),
    item: bigintField().positive('Item is required'),
    location: bigintField().positive().optional(),
});

export type GenerateTenderNameDto = z.infer<typeof GenerateTenderNameSchema>;
