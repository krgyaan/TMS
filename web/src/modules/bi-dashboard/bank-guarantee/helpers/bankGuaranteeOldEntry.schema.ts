import { z } from 'zod';

const optionalNumber = z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0, 'Cannot be negative').optional(),
);

const requiredNumber = z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number({ error: 'Required' }).min(0, 'Cannot be negative'),
);

const optionalEmail = z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address')
    .optional();

export const BankGuaranteeOldEntrySchema = z.object({
    purpose: z.string().trim().min(1, 'Purpose is required'),
    bgFavour: z.string().trim().min(1, 'BG in favour of is required'),
    bgAddress: z.string().trim().min(1, 'BG Address is required'),
    bgExpiryDate: z.string().trim().min(1, 'BG Expiry Date is required'),
    bgClaimPeriod: z.string().trim().min(1, 'BG Claim Period is required'),
    amount: z.coerce.number().gt(0, 'BG Amount must be greater than 0'),
    stampValue: requiredNumber,
    bgPoFiles: z.array(z.string()).optional(),
    clientUserEmail: optionalEmail,
    clientCpEmail: optionalEmail,
    clientFinanceEmail: optionalEmail,
    accountName: z.string().trim().optional(),
    accountNo: z.string().trim().optional(),
    ifsc: z.string().trim().optional(),
    bankName: z.string().trim().min(1, 'Bank is required'),
    bgNo: z.string().trim().min(1, 'BG No. is required'),
    bgDate: z.string().trim().min(1, 'BG Creation Date is required'),
    remarks: z.string().trim().optional(),
    fdrPer: requiredNumber,
    fdrAmt: requiredNumber,
    fdrNo: z.string().trim().min(1, 'FDR No. is required'),
    fdrValidity: z.string().trim().min(1, 'FDR Validity is required'),
    fdrRoi: requiredNumber,
    bgChargeDeducted: optionalNumber,
    sfmsChargeDeducted: optionalNumber,
    stampChargeDeducted: optionalNumber,
    otherChargeDeducted: optionalNumber,
    courierId: z.string().optional(),
    bgUpload: z.array(z.string()).min(1, 'Soft copy of BG is required'),
    sfmsConf: z.array(z.string()).optional(),
    fdrCopy: z.array(z.string()).optional(),
});

export type BankGuaranteeOldEntryFormValues = z.infer<typeof BankGuaranteeOldEntrySchema>;
