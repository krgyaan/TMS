import { z } from 'zod';

const optionalNumber = z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0, 'Cannot be negative').optional(),
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
    stampValue: optionalNumber,
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
    fdrPer: optionalNumber,
    fdrAmt: optionalNumber,
    fdrNo: z.string().trim().optional(),
    fdrValidity: z.string().trim().optional(),
    fdrRoi: optionalNumber,
    bgChargeDeducted: optionalNumber,
    sfmsChargeDeducted: optionalNumber,
    stampChargeDeducted: optionalNumber,
    otherChargeDeducted: optionalNumber,
    courierId: z.string().optional(),
    bgUpload: z.array(z.string()).optional(),
    sfmsConf: z.array(z.string()).optional(),
    fdrCopy: z.array(z.string()).optional(),
});

export type BankGuaranteeOldEntryFormValues = z.infer<typeof BankGuaranteeOldEntrySchema>;
