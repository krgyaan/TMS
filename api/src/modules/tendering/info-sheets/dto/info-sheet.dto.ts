import { z } from 'zod';

// Helper to transform empty strings to null
const optionalString = z
    .union([z.string(), z.undefined(), z.null()])
    .transform((v) => {
        if (v === null || v === undefined) return null;
        const trimmed = String(v).trim();
        return trimmed.length > 0 ? trimmed : null;
    });

// Helper for optional numbers
const optionalNumber = (schema: z.ZodNumber = z.coerce.number()) =>
    z
        .union([schema, z.undefined(), z.null(), z.literal('')])
        .transform((v) => {
            if (v === null || v === undefined || v === '') return null;
            const num = typeof v === 'number' ? v : Number(v);
            return Number.isNaN(num) ? null : num;
        });

// Helper for optional arrays
const optionalStringArray = z
    .union([z.array(z.string()), z.undefined(), z.null()])
    .transform((v) => {
        if (!v || !Array.isArray(v) || v.length === 0) return null;
        return v.filter((item) => item && String(item).trim().length > 0);
    });

// Client schema
const ClientSchema = z.object({
    clientName: z.string().min(1, 'Client name is required'),
    clientDesignation: optionalString,
    clientMobile: optionalString,
    clientEmail: z.string().email('Invalid email').optional().or(z.literal('')).transform((v) => (v === '' ? null : v)),
});

export const TenderInfoSheetPayloadSchema = z.object({
    // OEM Experience
    tenderValue: optionalNumber(z.coerce.number().nonnegative()),
    oemExperience: z.enum(['YES', 'NO']).optional().nullable(),
    // TE Recommendation
    teRecommendation: z.enum(['YES', 'NO']),
    teRejectionReason: optionalNumber(z.coerce.number().int().min(1)),
    teRejectionRemarks: optionalString,
    // Processing Fee
    processingFeeRequired: z.enum(['YES', 'NO']).optional().nullable(),
    processingFeeAmount: optionalNumber(z.coerce.number().nonnegative()),
    processingFeeModes: optionalStringArray,

    // Tender Fee
    tenderFeeRequired: z.enum(['YES', 'NO']).optional().nullable(),
    tenderFeeAmount: optionalNumber(z.coerce.number().nonnegative()),
    tenderFeeModes: optionalStringArray,

    // EMD
    emdRequired: z.enum(['YES', 'NO', 'EXEMPT']).optional().nullable(),
    emdAmount: optionalNumber(z.coerce.number().nonnegative()),
    emdModes: optionalStringArray,

    // Auction & Terms
    reverseAuctionApplicable: z.enum(['YES', 'NO']).optional().nullable(),
    paymentTermsSupply: optionalNumber(z.coerce.number().int().min(0).max(100)),
    paymentTermsInstallation: optionalNumber(z.coerce.number().int().min(0).max(100)),
    bidValidityDays: optionalNumber(z.coerce.number().int().min(0).max(366)),
    commercialEvaluation: z
        .enum(['ITEM_WISE_GST_INCLUSIVE', 'ITEM_WISE_PRE_GST', 'OVERALL_GST_INCLUSIVE', 'OVERALL_PRE_GST'])
        .optional()
        .nullable(),
    mafRequired: z.enum(['YES_GENERAL', 'YES_PROJECT_SPECIFIC', 'NO']).optional().nullable(),

    // Delivery Time
    deliveryTimeSupply: optionalNumber(z.coerce.number().int().positive()),
    deliveryTimeInstallationInclusive: z.boolean().optional().default(false),
    deliveryTimeInstallationDays: optionalNumber(z.coerce.number().int().positive()),

    // PBG
    pbgRequired: z.enum(['YES', 'NO']).optional().nullable(),
    pbgMode: optionalStringArray,
    pbgPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    pbgDurationMonths: optionalNumber(z.coerce.number().int().min(0).max(120)),

    // Security Deposit
    sdRequired: z.enum(['YES', 'NO']).optional().nullable(),
    sdMode: optionalStringArray,
    sdPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    sdDurationMonths: optionalNumber(z.coerce.number().int().min(0).max(120)),

    // LD
    ldRequired: z.enum(['YES', 'NO']).optional().nullable(),
    ldPercentagePerWeek: optionalNumber(z.coerce.number().min(0).max(5)),
    maxLdPercentage: optionalNumber(z.coerce.number().min(0).max(100)),

    // Physical Docs
    physicalDocsRequired: z.enum(['YES', 'NO']).optional().nullable(),
    physicalDocsDeadline: z
        .union([z.string(), z.date(), z.undefined(), z.null()])
        .transform((v) => {
            if (!v) return null;
            if (v instanceof Date) return v;
            const date = new Date(v);
            return isNaN(date.getTime()) ? null : date;
        })
        .optional()
        .nullable(),

    // Technical Eligibility
    techEligibilityAge: optionalNumber(z.coerce.number().int().nonnegative()),

    // Work Value Type
    workValueType: z.enum(['WORKS_VALUES', 'CUSTOM']).optional().nullable(),
    orderValue1: optionalNumber(z.coerce.number().nonnegative()),
    orderValue2: optionalNumber(z.coerce.number().nonnegative()),
    orderValue3: optionalNumber(z.coerce.number().nonnegative()),
    customEligibilityCriteria: optionalString,

    // Financial Requirements
    avgAnnualTurnoverType: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional().nullable(),
    avgAnnualTurnoverValue: optionalNumber(z.coerce.number().nonnegative()),
    workingCapitalType: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional().nullable(),
    workingCapitalValue: optionalNumber(z.coerce.number().nonnegative()),
    solvencyCertificateType: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional().nullable(),
    solvencyCertificateValue: optionalNumber(z.coerce.number().nonnegative()),
    netWorthType: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional().nullable(),
    netWorthValue: optionalNumber(z.coerce.number().nonnegative()),

    // Documents
    technicalWorkOrders: optionalStringArray,
    commercialDocuments: optionalStringArray,

    // Client & Address (zero or more clients allowed)
    clients: z.array(ClientSchema),
    courierAddress: optionalString,

    // Final Remark
    teFinalRemark: optionalString,
});

export type TenderInfoSheetPayload = z.infer<typeof TenderInfoSheetPayloadSchema>;
