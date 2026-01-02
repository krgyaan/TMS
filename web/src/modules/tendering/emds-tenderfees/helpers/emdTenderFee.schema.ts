import { z } from 'zod';
import { DELIVERY_OPTIONS } from '../constants';

// Extract delivery option values for enum validation
const DELIVERY_OPTION_VALUES = DELIVERY_OPTIONS.map(option => option.value) as ['TENDER_DUE', '24', '48', '72', '96', '120'];

// Helper to create enum field that accepts empty strings and transforms them to undefined
// Also handles cases where SelectField converts numeric strings to numbers
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

/**
 * Schema for payment details (shared by EMD, Tender Fee, Processing Fee)
 */
export const PaymentDetailsSchema = z.object({
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
    bgClientUserEmail: z.string().email().optional().or(z.literal('')),
    bgClientCpEmail: z.string().email().optional().or(z.literal('')),
    bgClientFinanceEmail: z.string().email().optional().or(z.literal('')),
    bgCourierAddress: z.string().optional(),
    bgCourierDays: z.coerce.number().min(1).max(10).optional(),
    bgBank: z.string().optional(),

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
 * Schema for EMD/Tender Fee/Processing Fee request form
 */
export const EmdRequestSchema = z.object({
    // EMD
    emd: z.object({
        mode: z.enum(['DD', 'FDR', 'BG', 'CHEQUE', 'BT', 'POP', 'SURETY_BOND', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),

    // Tender Fee
    tenderFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),

    // Processing Fee
    processingFee: z.object({
        mode: z.enum(['POP', 'BT', 'DD', 'NA']).optional(),
        details: PaymentDetailsSchema.optional(),
    }).optional(),
});

export type EmdRequestFormValues = z.infer<typeof EmdRequestSchema>;
export type PaymentDetailsFormValues = z.infer<typeof PaymentDetailsSchema>;
