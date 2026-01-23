import { z } from 'zod';
import { DELIVERY_OPTIONS } from '../constants';

const DELIVERY_OPTION_VALUES = DELIVERY_OPTIONS.map(option => option.value) as ['TENDER_DUE', '24', '48', '72', '96', '120'];

const deliveryEnumField = () =>
    z.preprocess(
        (val) => {
            // Handle empty/null/undefined
            if (val === '' || val === null || val === undefined) {
                return undefined;
            }
            // Convert numbers back to strings (SelectField converts "72" to 72)
            if (typeof val === 'number') {
                return String(val);
            }
            // Ensure string values match enum
            return val;
        },
        z.enum(DELIVERY_OPTION_VALUES).optional()
    );

export const PaymentDetailsSchema = z.object({
    // Common amount field (used in OLD_EMD and BI_OTHER_THAN_EMD forms) and is required
    portalAmount: z.coerce.number().optional(),
    btAmount: z.coerce.number().optional(),
    ddAmount: z.coerce.number().optional(),
    bgAmount: z.coerce.number().optional(),
    fdrAmount: z.coerce.number().optional(),
    chequeAmount: z.coerce.number().optional(),

    // DD fields
    ddFavouring: z.string().optional(),
    ddPayableAt: z.string().optional(),
    ddDeliverBy: deliveryEnumField(),
    ddPurpose: z.string().optional(),
    ddCourierAddress: z.string().optional(),
    ddCourierHours: z.coerce.number().optional(),
    ddDate: z.string().optional(),
    ddRemarks: z.string().optional(),

    // FDR fields
    fdrFavouring: z.string().optional(),
    fdrExpiryDate: z.string().optional(),
    fdrDeliverBy: deliveryEnumField(),
    fdrPurpose: z.string().optional(),
    fdrCourierAddress: z.string().optional(),
    fdrCourierHours: z.coerce.number().optional(),
    fdrDate: z.string().optional(),

    // BG fields
    bgNeededIn: z.string().optional(),
    bgPurpose: z.string().optional(),
    bgFavouring: z.string().optional(),
    bgAddress: z.string().optional(),
    bgExpiryDate: z.string().optional(),
    bgClaimPeriod: z.string().optional(),
    bgStampValue: z.coerce.number().optional(),
    bgFormatFiles: z.array(z.string()).optional(),
    bgPoFiles: z.array(z.string()).optional(),
    bgClientUserEmail: z.email().optional().or(z.literal('')),
    bgClientCpEmail: z.email().optional().or(z.literal('')),
    bgClientFinanceEmail: z.email().optional().or(z.literal('')),
    bgCourierAddress: z.string().optional(),
    bgCourierDays: z.coerce.number().min(1).max(10).optional(),
    bgBank: z.string().optional(),
    bgBankAccountName: z.string().optional(),
    bgBankAccountNo: z.string().optional(),
    bgBankIfsc: z.string().optional(),

    // Bank Transfer fields
    btPurpose: z.string().optional(),
    btAccountName: z.string().optional(),
    btAccountNo: z.string().optional(),
    btIfsc: z.string().optional(),

    // Portal fields
    portalPurpose: z.string().optional(),
    portalName: z.string().optional(),
    portalNetBanking: z.enum(['YES', 'NO']).optional(),
    portalDebitCard: z.enum(['YES', 'NO']).optional(),

    // Cheque fields
    chequeFavouring: z.string().optional(),
    chequeDate: z.string().optional(),
    chequeNeededIn: deliveryEnumField(),
    chequePurpose: z.string().optional(),
    chequeAccount: z.string().optional(),
});

/**
 * Helper function to validate payment details based on selected mode
 * Only fields relevant to the selected mode are required
 */
function validatePaymentDetailsByMode(data: z.infer<typeof PaymentDetailsSchema>, mode: string | undefined, ctx: z.RefinementCtx) {
    if (!mode || mode === 'NA') return;

    // DD mode validation
    if (mode === 'DD') {
        if (!data.ddFavouring || (typeof data.ddFavouring === 'string' && data.ddFavouring.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'DD in Favour of is required',
                path: ['details', 'ddFavouring'],
            });
        }
        if (!data.ddPayableAt || (typeof data.ddPayableAt === 'string' && data.ddPayableAt.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Payable At is required',
                path: ['details', 'ddPayableAt'],
            });
        }
        if (!data.ddDeliverBy) {
            ctx.addIssue({
                code: 'custom',
                message: 'Deliver By is required',
                path: ['details', 'ddDeliverBy'],
            });
        }
        if (!data.ddPurpose || (typeof data.ddPurpose === 'string' && data.ddPurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Purpose of DD is required',
                path: ['details', 'ddPurpose'],
            });
        }
        if (data.ddAmount !== undefined && data.ddAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'Amount must be greater than 0',
                path: ['details', 'ddAmount'],
            });
        }
    }

    // FDR mode validation
    if (mode === 'FDR') {
        if (!data.fdrFavouring || (typeof data.fdrFavouring === 'string' && data.fdrFavouring.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'FDR in Favour of is required',
                path: ['details', 'fdrFavouring'],
            });
        }
        if (!data.fdrExpiryDate || (typeof data.fdrExpiryDate === 'string' && data.fdrExpiryDate.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'FDR Expiry Date is required',
                path: ['details', 'fdrExpiryDate'],
            });
        }
        if (!data.fdrDeliverBy) {
            ctx.addIssue({
                code: 'custom',
                message: 'Deliver By is required',
                path: ['details', 'fdrDeliverBy'],
            });
        }
        if (!data.fdrPurpose || (typeof data.fdrPurpose === 'string' && data.fdrPurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Purpose of FDR is required',
                path: ['details', 'fdrPurpose'],
            });
        }
        if (data.fdrAmount !== undefined && data.fdrAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'FDR Amount must be greater than 0',
                path: ['details', 'fdrAmount'],
            });
        }
    }

    // BG mode validation
    if (mode === 'BG') {
        if (!data.bgNeededIn || (typeof data.bgNeededIn === 'string' && data.bgNeededIn.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Needed In is required',
                path: ['details', 'bgNeededIn'],
            });
        }
        if (!data.bgPurpose || (typeof data.bgPurpose === 'string' && data.bgPurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Purpose of BG is required',
                path: ['details', 'bgPurpose'],
            });
        }
        if (data.bgAmount !== undefined && data.bgAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Amount must be greater than 0',
                path: ['details', 'bgAmount'],
            });
        }
        if (!data.bgFavouring || (typeof data.bgFavouring === 'string' && data.bgFavouring.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG in Favour of is required',
                path: ['details', 'bgFavouring'],
            });
        }
        if (!data.bgAddress || (typeof data.bgAddress === 'string' && data.bgAddress.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Address is required',
                path: ['details', 'bgAddress'],
            });
        }
        if (!data.bgExpiryDate || (typeof data.bgExpiryDate === 'string' && data.bgExpiryDate.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Expiry Date is required',
                path: ['details', 'bgExpiryDate'],
            });
        }
        if (!data.bgClaimPeriod || (typeof data.bgClaimPeriod === 'string' && data.bgClaimPeriod.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Claim Period is required',
                path: ['details', 'bgClaimPeriod'],
            });
        }
        if (data.bgStampValue !== undefined && data.bgStampValue < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Stamp Value must be greater than 0',
                path: ['details', 'bgStampValue'],
            });
        }
        if (!data.bgBank || (typeof data.bgBank === 'string' && data.bgBank.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'BG Bank is required',
                path: ['details', 'bgBank'],
            });
        }
        if (!data.bgCourierAddress || (typeof data.bgCourierAddress === 'string' && data.bgCourierAddress.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Courier Address is required',
                path: ['details', 'bgCourierAddress'],
            });
        }
    }

    // Bank Transfer mode validation
    if (mode === 'BT') {
        if (!data.btPurpose || (typeof data.btPurpose === 'string' && data.btPurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Bank Transfer Purpose is required',
                path: ['details', 'btPurpose'],
            });
        }
        if (!data.btAccountName || (typeof data.btAccountName === 'string' && data.btAccountName.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Bank Transfer Account Name is required',
                path: ['details', 'btAccountName'],
            });
        }
        if (!data.btAccountNo || (typeof data.btAccountNo === 'string' && data.btAccountNo.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Bank Transfer Account No. is required',
                path: ['details', 'btAccountNo'],
            });
        }
        if (!data.btIfsc || (typeof data.btIfsc === 'string' && data.btIfsc.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Bank Transfer IFSC is required',
                path: ['details', 'btIfsc'],
            });
        }
        if (data.btAmount !== undefined && data.btAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'Amount must be greater than 0',
                path: ['details', 'btAmount'],
            });
        }
    }

    // Portal mode validation
    if (mode === 'POP') {
        if (!data.portalPurpose || (typeof data.portalPurpose === 'string' && data.portalPurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Portal Purpose is required',
                path: ['details', 'portalPurpose'],
            });
        }
        if (!data.portalName || (typeof data.portalName === 'string' && data.portalName.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Portal Name is required',
                path: ['details', 'portalName'],
            });
        }
        if (data.portalAmount !== undefined && data.portalAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'Amount must be greater than 0',
                path: ['details', 'portalAmount'],
            });
        }
    }

    // Cheque mode validation
    if (mode === 'CHEQUE') {
        if (!data.chequeFavouring || (typeof data.chequeFavouring === 'string' && data.chequeFavouring.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Cheque in Favour of is required',
                path: ['details', 'chequeFavouring'],
            });
        }
        if (!data.chequeDate || (typeof data.chequeDate === 'string' && data.chequeDate.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Cheque Date is required',
                path: ['details', 'chequeDate'],
            });
        }
        if (!data.chequeNeededIn) {
            ctx.addIssue({
                code: 'custom',
                message: 'Cheque Needed In is required',
                path: ['details', 'chequeNeededIn'],
            });
        }
        if (!data.chequePurpose || (typeof data.chequePurpose === 'string' && data.chequePurpose.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Purpose of Cheque is required',
                path: ['details', 'chequePurpose'],
            });
        }
        if (!data.chequeAccount || (typeof data.chequeAccount === 'string' && data.chequeAccount.trim() === '')) {
            ctx.addIssue({
                code: 'custom',
                message: 'Cheque Account is required',
                path: ['details', 'chequeAccount'],
            });
        }
        if (data.chequeAmount !== undefined && data.chequeAmount < 0) {
            ctx.addIssue({
                code: 'custom',
                message: 'Cheque Amount must be greater than 0',
                path: ['details', 'chequeAmount'],
            });
        }
    }
}

/**
 * Schema for EMD/Tender Fee/Processing Fee request form
 */
export const EmdRequestSchema = z.object({
    // EMD
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BT', 'POP', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),

    // Tender Fee
    tenderFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),

    // Processing Fee
    processingFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),
});

/**
 * Schema for Old EMD Request Form (includes tender details)
 */
export const OldEmdRequestSchema = z.object({
    tenderName: z.string().min(1, 'Tender/Project Name is required'),
    tenderNo: z.string().min(1, 'Tender/Work Order No. is required'),
    tenderDueDate: z.string().min(1, 'Tender/Work Order Due Date is required'),
    // EMD
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BT', 'POP', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),

    // Tender Fee
    tenderFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),

    // Processing Fee
    processingFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.mode !== 'NA' && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),
});

/**
 * Schema for BI Other Than EMD Request Form (includes tender details, only EMD)
 */
export const BiOtherThanEmdRequestSchema = z.object({
    tenderName: z.string().min(1, 'Tender/Project Name is required'),
    tenderNo: z.string().min(1, 'Tender/Work Order No. is required'),
    tenderDueDate: z.string().min(1, 'Tender/Work Order Due Date is required'),
    // EMD only
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine((data, ctx) => {
        if (data.mode && data.details) {
            validatePaymentDetailsByMode(data.details, data.mode, ctx);
        }
    }).optional(),
});

export type EmdRequestFormValues = z.infer<typeof EmdRequestSchema>;
export type OldEmdRequestFormValues = z.infer<typeof OldEmdRequestSchema>;
export type BiOtherThanEmdRequestFormValues = z.infer<typeof BiOtherThanEmdRequestSchema>;
export type PaymentDetailsFormValues = z.infer<typeof PaymentDetailsSchema>;
