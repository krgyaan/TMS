import { z } from 'zod';

export const TenderInformationFormSchema = z.object({
    // TE Recommendation
    teRecommendation: z.enum(['YES', 'NO']),
    teRejectionReason: z.coerce.number().int().min(1).nullable().optional(),
    teRejectionRemarks: z.string().max(1000).optional(),
    teRejectionProof: z.array(z.string()).default([]),

    // Processing Fee
    processingFeeRequired: z.enum(['YES', 'NO']).optional(),
    processingFeeModes: z.array(z.string()).optional(),
    processingFeeAmount: z.coerce.number().nonnegative().optional(),

    // Tender Fee
    tenderFeeRequired: z.enum(['YES', 'NO']).optional(),
    tenderFeeModes: z.array(z.string()).optional(),
    tenderFeeAmount: z.coerce.number().nonnegative().optional(),

    // EMD
    emdRequired: z.enum(['YES', 'NO', 'EXEMPT']).optional(),
    emdModes: z.array(z.string()).optional(),
    emdAmount: z.coerce.number().nonnegative().optional(),

    // Tender Value
    tenderValue: z.coerce
        .number()
        .nonnegative()
        .optional()
        .refine((val) => val === undefined || val === null || val >= 0, {
            message: 'Tender value must be positive',
        }),

    // OEM Experience
    oemExperience: z.enum(['YES', 'NO']).nullable().optional(),

    // Bid & Commercial
    bidValidityDays: z.coerce.number().int().min(0).max(366).optional(),
    commercialEvaluation: z
        .enum([
            'ITEM_WISE_GST_INCLUSIVE',
            'ITEM_WISE_PRE_GST',
            'OVERALL_GST_INCLUSIVE',
            'OVERALL_PRE_GST',
        ])
        .optional(),
    mafRequired: z
        .enum(['YES_GENERAL', 'YES_PROJECT_SPECIFIC', 'NO'])
        .optional(),
    reverseAuctionApplicable: z.enum(['YES', 'NO']).optional(),

    // Payment Terms
    paymentTermsSupply: z.coerce.number().min(0).max(100).optional(),
    paymentTermsInstallation: z.coerce.number().min(0).max(100).optional(),

    // Delivery Time
    deliveryTimeSupply: z.preprocess(
        (v) => {
            if (v === null || v === undefined || v === '' || v === 0)
                return null;
            const num = typeof v === 'number' ? v : Number(v);
            if (isNaN(num) || num <= 0) return null;
            return num;
        },
        z.number().int().positive().nullable().optional()
    ),
    deliveryTimeInstallationInclusive: z.boolean().default(false),
    deliveryTimeInstallation: z.preprocess(
        (v) => {
            if (v === null || v === undefined || v === '' || v === 0)
                return undefined;
            const num = typeof v === 'number' ? v : Number(v);
            if (isNaN(num) || num <= 0) return undefined;
            return num;
        },
        z.number().int().positive().optional()
    ),

    // PBG
    pbgRequired: z.enum(['YES', 'NO']).optional(),
    pbgForm: z.array(z.string()).optional(),
    pbgPercentage: z.coerce.number().min(0).max(100).optional(),
    pbgDurationMonths: z.coerce.number().int().min(0).max(120).optional(),

    // Security Deposit
    sdRequired: z.enum(['YES', 'NO']).optional(),
    sdForm: z.array(z.string()).optional(),
    securityDepositPercentage: z.coerce.number().min(0).max(100).optional(),
    sdDurationMonths: z.coerce.number().int().min(0).max(120).optional(),

    // LD
    ldRequired: z.enum(['YES', 'NO']).optional(),
    ldPercentagePerWeek: z.coerce.number().min(0).max(5).optional(),
    maxLdPercentage: z.coerce.number().min(0).max(100).optional(),

    // Physical Docs
    physicalDocsRequired: z.enum(['YES', 'NO']).optional(),
    physicalDocType: z
        .enum(['ONLY_EMD', 'ONLY_OTHER_DOCUMENT', 'EMD_AND_OTHER_DOCUMENTS'])
        .optional(),
    physicalDocsDeadline: z.string().optional(),

    // Technical Eligibility
    techEligibilityAgeYears: z.coerce
        .number()
        .int()
        .nonnegative()
        .optional(),

    // Work Value Type
    workValueType: z.enum(['WORKS_VALUES', 'CUSTOM']).optional(),
    orderValue1: z.coerce.number().nonnegative().optional(),
    orderValue2: z.coerce.number().nonnegative().optional(),
    orderValue3: z.coerce.number().nonnegative().optional(),
    customEligibilityCriteria: z.string().max(1000).optional(),

    // Documents
    technicalWorkOrders: z.array(z.string()).optional(),
    commercialDocuments: z.array(z.string()).optional(),

    // Financial Requirements
    avgAnnualTurnoverCriteria: z
        .enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT'])
        .optional(),
    avgAnnualTurnoverValue: z.coerce.number().nonnegative().optional(),
    workingCapitalCriteria: z
        .enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT'])
        .optional(),
    workingCapitalValue: z.coerce.number().nonnegative().optional(),
    solvencyCertificateCriteria: z
        .enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT'])
        .optional(),
    solvencyCertificateValue: z.coerce.number().nonnegative().optional(),
    netWorthCriteria: z
        .enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT'])
        .optional(),
    netWorthValue: z.coerce.number().nonnegative().optional(),

    // Client Details
    clients: z.array(
        z.object({
            clientName: z.string().min(1, 'Client name is required'),
            clientDesignation: z.string().optional(),
            clientMobile: z.string().max(200).optional(),
            clientEmail: z
                .string()
                .email('Invalid email')
                .optional()
                .or(z.literal('')),
        })
    ),

    // Address & Remarks
    courierAddress: z.string().max(1000).optional(),
    teRemark: z.string().max(1000).optional(),
}).superRefine((data, ctx) => {
    if (data.teRecommendation === 'NO') {
        // ── Rejection fields are required when NO ──────────────────────
        if (!data.teRejectionReason) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Rejection reason is required',
                path: ['teRejectionReason'],
            });
        }
        if (!data.teRejectionRemarks?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Rejection remarks are required',
                path: ['teRejectionRemarks'],
            });
        }
        if (!data.teRejectionProof?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Proof of rejection is required',
                path: ['teRejectionProof'],
            });
        }
        // ── Skip ALL YES-branch validation when NO ─────────────────────
        return;
    }

    // ── Only run these checks when teRecommendation === 'YES' ──────────

    // Processing fee sub-fields
    if (data.processingFeeRequired === 'YES') {
        if (!data.processingFeeModes?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one processing fee mode is required',
                path: ['processingFeeModes'],
            });
        }
    }

    // Tender fee sub-fields
    if (data.tenderFeeRequired === 'YES') {
        if (!data.tenderFeeModes?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one tender fee mode is required',
                path: ['tenderFeeModes'],
            });
        }
    }

    // EMD sub-fields
    if (data.emdRequired === 'YES') {
        if (!data.emdModes?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'At least one EMD mode is required',
                path: ['emdModes'],
            });
        }
    }

    // PBG sub-fields
    if (data.pbgRequired === 'YES') {
        if (!data.pbgForm?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'PBG form is required',
                path: ['pbgForm'],
            });
        }
    }

    // SD sub-fields
    if (data.sdRequired === 'YES') {
        if (!data.sdForm?.length) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'SD form is required',
                path: ['sdForm'],
            });
        }
    }

    // Physical docs sub-fields
    if (data.physicalDocsRequired === 'YES') {
        if (!data.physicalDocType) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Physical document type is required',
                path: ['physicalDocType'],
            });
        }
        if (!data.physicalDocsDeadline?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Physical docs submission deadline is required',
                path: ['physicalDocsDeadline'],
            });
        }
    }

    // Work value sub-fields
    if (data.workValueType === 'CUSTOM') {
        if (!data.customEligibilityCriteria?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Custom eligibility criteria is required',
                path: ['customEligibilityCriteria'],
            });
        }
    }

    // Delivery time: installation required when not inclusive
    if (
        !data.deliveryTimeInstallationInclusive &&
        (data.deliveryTimeInstallation === undefined ||
            data.deliveryTimeInstallation === null)
    ) {
        // Only warn if supply time is set — installation days are then expected
        if (data.deliveryTimeSupply) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'Installation days are required when not inclusive in supply time',
                path: ['deliveryTimeInstallation'],
            });
        }
    }
});