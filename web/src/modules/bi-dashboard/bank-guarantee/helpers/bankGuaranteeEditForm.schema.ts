import { z } from 'zod';

export const BankGuaranteeEditFormSchema = z.object({
    // Payment Instrument fields
    amount: z.coerce.number().min(1, 'Amount is required'),
    favouring: z.string().optional().nullable(),
    payableAt: z.string().optional().nullable(),
    issueDate: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    validityDate: z.string().optional().nullable(),
    claimExpiryDate: z.string().optional().nullable(),
    status: z.string().optional(),
    action: z.coerce.number().optional(),
    utr: z.string().optional().nullable(),
    docketNo: z.string().optional().nullable(),
    courierAddress: z.string().optional().nullable(),
    courierDeadline: z.coerce.number().optional().nullable(),
    bg_req: z.string().optional().nullable(),
    modification_required: z.string().optional().nullable(),
    approve_bg: z.string().optional().nullable(),

    // BG Details fields
    bgNo: z.string().optional().nullable(),
    bgDate: z.string().optional().nullable(),
    beneficiaryName: z.string().optional().nullable(),
    beneficiaryAddress: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    cashMarginPercent: z.coerce.number().optional().nullable(),
    fdrMarginPercent: z.coerce.number().optional().nullable(),
    stampCharges: z.coerce.number().optional().nullable(),
    sfmsCharges: z.coerce.number().optional().nullable(),
    stampChargesDeducted: z.coerce.number().optional().nullable(),
    sfmsChargesDeducted: z.coerce.number().optional().nullable(),
    otherChargesDeducted: z.coerce.number().optional().nullable(),
    bgChargeDeducted: z.coerce.number().optional().nullable(),
    
    // FDR Details
    fdrNo: z.string().optional().nullable(),
    fdrAmt: z.coerce.number().optional().nullable(),
    fdrPer: z.coerce.number().optional().nullable(),
    fdrValidity: z.string().optional().nullable(),
    fdrRoi: z.coerce.number().optional().nullable(),

    // Extension Details
    extendedAmount: z.coerce.number().optional().nullable(),
    extendedValidityDate: z.string().optional().nullable(),
    extendedClaimExpiryDate: z.string().optional().nullable(),
    extendedBankName: z.string().optional().nullable(),
    newStampChargeDeducted: z.coerce.number().optional().nullable(),

    // Files (can be string paths or File objects)
    docket_slip: z.any().optional(),
    covering_letter: z.any().optional(),
    cancel_pdf: z.any().optional(),
    extension_letter_path: z.any().optional(),
    cancellation_letter_path: z.any().optional(),
    bg_format_te: z.any().optional(),
    bg_format_tl: z.any().optional(),
    sfms_conf: z.any().optional(),
    fdr_copy: z.any().optional(),
    stamp_covering_letter: z.any().optional(),
    cancell_confirm: z.any().optional(),
    prefilled_signed_bg: z.any().optional(),

    // Misc
    bgNeeds: z.string().optional().nullable(),
    bgPurpose: z.string().optional().nullable(),
    bgSoftCopy: z.string().optional().nullable(),
    bgPo: z.any().optional().nullable(),
    bgClientUser: z.string().optional().nullable(),
    bgClientCp: z.string().optional().nullable(),
    bgClientFin: z.string().optional().nullable(),
    bgBankAcc: z.string().optional().nullable(),
    bgBankIfsc: z.string().optional().nullable(),
    courierNo: z.string().optional().nullable(),
    cancelRemark: z.string().optional().nullable(),
    bgFdrCancelDate: z.string().optional().nullable(),
    bgFdrCancelAmount: z.coerce.number().optional().nullable(),
    bgFdrCancelRefNo: z.string().optional().nullable(),
    bg2Remark: z.string().optional().nullable(),
    reasonReq: z.string().optional().nullable(),
});

export type BankGuaranteeEditFormValues = z.infer<typeof BankGuaranteeEditFormSchema>;
