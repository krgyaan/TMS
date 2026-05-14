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
    ddCourierName: z.string().optional(),
    ddCourierPhone: z.string().optional(),
    ddCourierAddressLine1: z.string().optional(),
    ddCourierAddressLine2: z.string().optional(),
    ddCourierCity: z.string().optional(),
    ddCourierState: z.string().optional(),
    ddCourierPincode: z.string().optional(),
    ddCourierHours: z.coerce.number().optional(),
    ddDate: z.string().optional(),
    ddRemarks: z.string().optional(),

    // FDR fields
    fdrFavouring: z.string().optional(),
    fdrExpiryDate: z.string().optional(),
    fdrDeliverBy: deliveryEnumField(),
    fdrPurpose: z.string().optional(),
    fdrCourierAddress: z.string().optional(),
    fdrCourierName: z.string().optional(),
    fdrCourierPhone: z.string().optional(),
    fdrCourierAddressLine1: z.string().optional(),
    fdrCourierAddressLine2: z.string().optional(),
    fdrCourierCity: z.string().optional(),
    fdrCourierState: z.string().optional(),
    fdrCourierPincode: z.string().optional(),
    fdrCourierHours: z.coerce.number().optional(),
    fdrDate: z.string().optional(),

    // BG fields
    bgNeededIn: z.coerce.string().optional(),
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

export const BankTransferSchema = z.object({
    btPurpose: z.string().optional(),
    btAmount: z.coerce.number().optional(),
    btAccountName: z.string().optional(),
    btAccountNo: z.string().optional(),
    btIfsc: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.btPurpose || (typeof data.btPurpose === 'string' && data.btPurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Bank Transfer Purpose is required',
            path: ['btPurpose'],
        });
    }
    if (!data.btAccountName || (typeof data.btAccountName === 'string' && data.btAccountName.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Bank Account Name is required',
            path: ['btAccountName'],
        });
    }
    if (!data.btAccountNo || (typeof data.btAccountNo === 'string' && data.btAccountNo.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Bank Account No. is required',
            path: ['btAccountNo'],
        });
    }
    if (!data.btIfsc || (typeof data.btIfsc === 'string' && data.btIfsc.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Bank IFSC is required',
            path: ['btIfsc'],
        });
    }
    if (data.btAmount !== undefined && data.btAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'Amount must be greater than 0',
            path: ['btAmount'],
        });
    }
});

export const PayOnPortalSchema = z.object({
    portalPurpose: z.string().optional(),
    portalAmount: z.coerce.number().optional(),
    portalName: z.string().optional(),
    portalNetBanking: z.enum(['YES', 'NO']).optional(),
    portalDebitCard: z.enum(['YES', 'NO']).optional(),
}).superRefine((data, ctx) => {
    if (!data.portalPurpose || (typeof data.portalPurpose === 'string' && data.portalPurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Payment Purpose is required',
            path: ['portalPurpose'],
        });
    }
    if (!data.portalName || (typeof data.portalName === 'string' && data.portalName.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Portal Name is required',
            path: ['portalName'],
        });
    }
    if (!data.portalNetBanking) {
        ctx.addIssue({
            code: 'custom',
            message: 'Is Net Banking Available ?',
            path: ['portalNetBanking'],
        });
    }
    if (!data.portalDebitCard) {
        ctx.addIssue({
            code: 'custom',
            message: 'Is Debit Card Allowed ?',
            path: ['portalDebitCard'],
        });
    }
    if (data.portalAmount !== undefined && data.portalAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'Amount must be greater than 0',
            path: ['portalAmount'],
        });
    }
});

const REQUIRED_COURIER_FIELDS = ['CourierName', 'CourierAddressLine1', 'CourierState', 'CourierPincode'] as const;

const validateCourierFields = (data: any, ctx: z.RefinementCtx, prefix: string) => {
    for (const field of REQUIRED_COURIER_FIELDS) {
        const key = `${prefix}${field}`;
        if (!data[key] || (typeof data[key] === 'string' && data[key].trim() === '')) {
            const label = field === 'CourierName' ? 'Courier Name'
                : field === 'CourierAddressLine1' ? 'Address Line 1'
                : field === 'CourierState' ? 'State'
                : 'Pin Code';
            ctx.addIssue({
                code: 'custom',
                message: `${label} is required`,
                path: [key],
            });
        }
    }
};

export const DemandDraftSchema = z.object({
    ddPurpose: z.string().optional(),
    ddAmount: z.coerce.number().optional(),
    ddFavouring: z.string().optional(),
    ddPayableAt: z.string().optional(),
    ddDeliverBy: z.string().optional(),
    ddCourierAddress: z.string().optional(),
    ddCourierName: z.string().optional(),
    ddCourierPhone: z.string().optional(),
    ddCourierAddressLine1: z.string().optional(),
    ddCourierAddressLine2: z.string().optional(),
    ddCourierCity: z.string().optional(),
    ddCourierState: z.string().optional(),
    ddCourierPincode: z.string().optional(),
    ddCourierHours: z.coerce.number().optional(),
    ddDate: z.string().optional(),
    ddRemarks: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.ddFavouring || (typeof data.ddFavouring === 'string' && data.ddFavouring.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'DD in Favour of is required',
            path: ['ddFavouring'],
        });
    }
    if (!data.ddPayableAt || (typeof data.ddPayableAt === 'string' && data.ddPayableAt.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Payable At is required',
            path: ['ddPayableAt'],
        });
    }
    if (!data.ddDeliverBy) {
        ctx.addIssue({
            code: 'custom',
            message: 'Deliver By is required',
            path: ['ddDeliverBy'],
        });
    }
    if (!data.ddPurpose || (typeof data.ddPurpose === 'string' && data.ddPurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Purpose of DD is required',
            path: ['ddPurpose'],
        });
    }
    validateCourierFields(data, ctx, 'dd');
    if (!data.ddCourierHours) {
        ctx.addIssue({
            code: 'custom',
            message: 'Courier Hours is required',
            path: ['ddCourierHours'],
        });
    }
    if (!data.ddDate || (typeof data.ddDate === 'string' && data.ddDate.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'DD Date is required',
            path: ['ddDate'],
        });
    }
    if (data.ddAmount !== undefined && data.ddAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'Amount must be greater than 0',
            path: ['ddAmount'],
        });
    }
});

export const BankGuaranteeSchema = z.object({
    bgPurpose: z.string().optional(),
    bgAmount: z.coerce.number().optional(),
    bgNeededIn: z.string().optional(),
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
}).superRefine((data, ctx) => {
    if (!data.bgNeededIn || (typeof data.bgNeededIn === 'string' && data.bgNeededIn.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Needed In is required',
            path: ['bgNeededIn'],
        });
    }
    if (!data.bgPurpose || (typeof data.bgPurpose === 'string' && data.bgPurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Purpose of BG is required',
            path: ['bgPurpose'],
        });
    }
    if (data.bgAmount !== undefined && data.bgAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Amount must be greater than 0',
            path: ['bgAmount'],
        });
    }
    if (!data.bgFavouring || (typeof data.bgFavouring === 'string' && data.bgFavouring.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG in Favour of is required',
            path: ['bgFavouring'],
        });
    }
    if (!data.bgAddress || (typeof data.bgAddress === 'string' && data.bgAddress.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Address is required',
            path: ['bgAddress'],
        });
    }
    if (!data.bgExpiryDate || (typeof data.bgExpiryDate === 'string' && data.bgExpiryDate.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Expiry Date is required',
            path: ['bgExpiryDate'],
        });
    }
    if (!data.bgClaimPeriod || (typeof data.bgClaimPeriod === 'string' && data.bgClaimPeriod.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Claim Period is required',
            path: ['bgClaimPeriod'],
        });
    }
    if (data.bgStampValue !== undefined && data.bgStampValue < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Stamp Value must be greater than 0',
            path: ['bgStampValue'],
        });
    }
    if (!data.bgBank || (typeof data.bgBank === 'string' && data.bgBank.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'BG Bank is required',
            path: ['bgBank'],
        });
    }
    if (!data.bgCourierAddress || (typeof data.bgCourierAddress === 'string' && data.bgCourierAddress.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Courier Address is required',
            path: ['bgCourierAddress'],
        });
    }
});

export const FdrSchema = z.object({
    fdrPurpose: z.string().optional(),
    fdrAmount: z.coerce.number().optional(),
    fdrFavouring: z.string().optional(),
    fdrExpiryDate: z.string().optional(),
    fdrDeliverBy: z.string().optional(),
    fdrCourierAddress: z.string().optional(),
    fdrCourierName: z.string().optional(),
    fdrCourierPhone: z.string().optional(),
    fdrCourierAddressLine1: z.string().optional(),
    fdrCourierAddressLine2: z.string().optional(),
    fdrCourierCity: z.string().optional(),
    fdrCourierState: z.string().optional(),
    fdrCourierPincode: z.string().optional(),
    fdrCourierHours: z.coerce.number().optional(),
    fdrDate: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.fdrFavouring || (typeof data.fdrFavouring === 'string' && data.fdrFavouring.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'FDR in Favour of is required',
            path: ['fdrFavouring'],
        });
    }
    if (!data.fdrExpiryDate || (typeof data.fdrExpiryDate === 'string' && data.fdrExpiryDate.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'FDR Expiry Date is required',
            path: ['fdrExpiryDate'],
        });
    }
    if (!data.fdrDeliverBy) {
        ctx.addIssue({
            code: 'custom',
            message: 'Deliver By is required',
            path: ['fdrDeliverBy'],
        });
    }
    if (!data.fdrPurpose || (typeof data.fdrPurpose === 'string' && data.fdrPurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Purpose of FDR is required',
            path: ['fdrPurpose'],
        });
    }
    validateCourierFields(data, ctx, 'fdr');
    if (!data.fdrCourierHours) {
        ctx.addIssue({
            code: 'custom',
            message: 'Courier Hours is required',
            path: ['fdrCourierHours'],
        });
    }
    if (!data.fdrDate || (typeof data.fdrDate === 'string' && data.fdrDate.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'FDR Date is required',
            path: ['fdrDate'],
        });
    }
    if (data.fdrAmount !== undefined && data.fdrAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'FDR Amount must be greater than 0',
            path: ['fdrAmount'],
        });
    }
});

export const ChequeSchema = z.object({
    chequePurpose: z.string().optional(),
    chequeAmount: z.coerce.number().optional(),
    chequeFavouring: z.string().optional(),
    chequeDate: z.string().optional(),
    chequeNeededIn: z.string().optional(),
    chequeAccount: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.chequeFavouring || (typeof data.chequeFavouring === 'string' && data.chequeFavouring.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Cheque in Favour of is required',
            path: ['chequeFavouring'],
        });
    }
    if (!data.chequeDate || (typeof data.chequeDate === 'string' && data.chequeDate.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Cheque Date is required',
            path: ['chequeDate'],
        });
    }
    if (!data.chequeNeededIn) {
        ctx.addIssue({
            code: 'custom',
            message: 'Cheque Needed In is required',
            path: ['chequeNeededIn'],
        });
    }
    if (!data.chequePurpose || (typeof data.chequePurpose === 'string' && data.chequePurpose.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Purpose of Cheque is required',
            path: ['chequePurpose'],
        });
    }
    if (!data.chequeAccount || (typeof data.chequeAccount === 'string' && data.chequeAccount.trim() === '')) {
        ctx.addIssue({
            code: 'custom',
            message: 'Cheque Account is required',
            path: ['chequeAccount'],
        });
    }
    if (data.chequeAmount !== undefined && data.chequeAmount < 0) {
        ctx.addIssue({
            code: 'custom',
            message: 'Cheque Amount must be greater than 0',
            path: ['chequeAmount'],
        });
    }
});

/**
 * Helper function to validate payment details based on the selected mode.
 * Simplifies the schema by using existing mode-specific schemas and fixing pathing issues.
 */
const validatePaymentMode = (data: { mode?: string; details?: any }, ctx: z.RefinementCtx) => {
    const { mode, details } = data;
    if (!mode || mode === 'NA') return;

    if (!details) {
        ctx.addIssue({
            code: 'custom',
            message: 'Please fill in all required fields for the selected payment mode',
            path: ['details'],
        });
        return;
    }

    let schema: z.ZodSchema | undefined;
    switch (mode) {
        case 'BANK_TRANSFER':
            schema = BankTransferSchema;
            break;
        case 'PORTAL':
            schema = PayOnPortalSchema;
            break;
        case 'DD':
            schema = DemandDraftSchema;
            break;
        case 'BG':
            schema = BankGuaranteeSchema;
            break;
        case 'FDR':
            schema = FdrSchema;
            break;
        case 'CHEQUE':
            schema = ChequeSchema;
            break;
        default:
            return;
    }

    if (schema) {
        const result = schema.safeParse(details);
        if (!result.success) {
            result.error.issues.forEach((issue) => {
                ctx.addIssue({
                    ...issue,
                    path: ['details', ...issue.path],
                });
            });
        }
    }
};

/**
 * Schema for EMD/Tender Fee/Processing Fee request form
 */
export const PaymentRequestSchema = z.object({
    tenderNo: z.string().optional(),
    tenderName: z.string().optional(),
    tenderDueDate: z.string().optional(),
    requestedBy: z.string().optional(),
    // EMD
    EMD: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BANK_TRANSFER', 'PORTAL', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),

    // Tender Fee
    TENDER_FEES: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),

    // Processing Fee
    PROCESSING_FEES: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),
});

/**
 * Schema for Old EMD Request Form (includes tender details)
 */
export const OldEntryPaymentRequestSchema = z.object({
    tenderName: z.string().optional(),
    tenderNo: z.string().optional(),
    tenderDueDate: z.string().optional(),
    // EMD
    EMD: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BANK_TRANSFER', 'PORTAL', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),

    // Tender Fee
    TENDER_FEES: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),

    // Processing Fee
    PROCESSING_FEES: z.object({
        mode: z.enum(['PORTAL', 'BANK_TRANSFER', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),
});

/**
 * Schema for BI Other Than EMD Request Form (includes tender details, only EMD)
 */
export const BiOtherThanTenderRequestSchema = z.object({
    tenderName: z.string().optional(),
    tenderNo: z.string().optional(),
    tenderDueDate: z.string().optional(),
    // EMD only
    EMD: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).superRefine(validatePaymentMode).optional(),
});

export type PaymentRequestFormValues = z.infer<typeof PaymentRequestSchema>;
export type OldEntryPaymentRequestFormValues = z.infer<typeof OldEntryPaymentRequestSchema>;
export type BiOtherThanTenderRequestFormValues = z.infer<typeof BiOtherThanTenderRequestSchema>;
export type PaymentDetailsFormValues = z.infer<typeof PaymentDetailsSchema>;
export type BankTransferFormValues = z.infer<typeof BankTransferSchema>;
export type PayOnPortalFormValues = z.infer<typeof PayOnPortalSchema>;
export type DemandDraftFormValues = z.infer<typeof DemandDraftSchema>;
export type BankGuaranteeFormValues = z.infer<typeof BankGuaranteeSchema>;
export type FdrFormValues = z.infer<typeof FdrSchema>;
export type ChequeFormValues = z.infer<typeof ChequeSchema>;
