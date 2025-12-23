import { z } from 'zod';

export const TenderInformationFormSchema = z.object({
    // TE Recommendation
    teRecommendation: z.enum(['YES', 'NO']),
    teRejectionReason: z.coerce.number().int().min(1).nullable().optional(),
    teRejectionRemarks: z.string().max(1000).optional(),

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
    tenderValueGstInclusive: z.coerce.number().nonnegative().optional(),

    // Bid & Commercial
    bidValidityDays: z.coerce.number().int().min(0).max(366).optional(),
    commercialEvaluation: z.enum([
        'ITEM_WISE_GST_INCLUSIVE',
        'ITEM_WISE_PRE_GST',
        'OVERALL_GST_INCLUSIVE',
        'OVERALL_PRE_GST'
    ]).optional(),
    mafRequired: z.enum(['YES_GENERAL', 'YES_PROJECT_SPECIFIC', 'NO']).optional(),
    reverseAuctionApplicable: z.enum(['YES', 'NO']).optional(),

    // Payment Terms
    paymentTermsSupply: z.coerce.number().min(0).max(100).optional(),
    paymentTermsInstallation: z.coerce.number().min(0).max(100).optional(),

    // Delivery Time
    deliveryTimeSupply: z.preprocess(
        (v) => {
            if (v === null || v === undefined || v === '' || v === 0) {
                return null;
            }
            const num = typeof v === 'number' ? v : Number(v);
            if (isNaN(num) || num <= 0) {
                return null;
            }
            return num;
        },
        z.number().int().positive().nullable().optional()
    ),
    deliveryTimeInstallationInclusive: z.boolean().default(false),
    deliveryTimeInstallation: z.preprocess(
        (v) => {
            // Convert 0, null, undefined, or empty string to null
            if (v === null || v === undefined || v === '' || v === 0) {
                return null;
            }
            const num = typeof v === 'number' ? v : Number(v);
            if (isNaN(num) || num <= 0) {
                return null;
            }
            return num;
        },
        z.number().int().positive().nullable().optional()
    ),

    // PBG
    pbgRequired: z.enum(['YES', 'NO']).optional(),
    pbgForm: z.enum(['DD_DEDUCTION', 'FDR', 'PBG', 'SB', 'NA']).optional(),
    pbgPercentage: z.coerce.number().min(0).max(100).optional(),
    pbgDurationMonths: z.coerce.number().int().min(0).max(120).optional(),

    // Security Deposit
    sdRequired: z.enum(['YES', 'NO']).optional(),
    sdForm: z.enum(['DD_DEDUCTION', 'FDR', 'PBG', 'SB', 'NA']).optional(),
    securityDepositPercentage: z.coerce.number().min(0).max(100).optional(),
    sdDurationMonths: z.coerce.number().int().min(0).max(120).optional(),

    // LD
    ldRequired: z.enum(['YES', 'NO']).optional(),
    ldPercentagePerWeek: z.coerce.number().min(0).max(5).optional(),
    maxLdPercentage: z.coerce.number().min(0).max(100).optional(),

    // Physical Docs
    physicalDocsRequired: z.enum(['YES', 'NO']).optional(),
    physicalDocsDeadline: z.string().optional(),

    // Technical Eligibility
    techEligibilityAgeYears: z.coerce.number().int().nonnegative().optional(),

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
    avgAnnualTurnoverCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    avgAnnualTurnoverValue: z.coerce.number().nonnegative().optional(),
    workingCapitalCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    workingCapitalValue: z.coerce.number().nonnegative().optional(),
    solvencyCertificateCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    solvencyCertificateValue: z.coerce.number().nonnegative().optional(),
    netWorthCriteria: z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']).optional(),
    netWorthValue: z.coerce.number().nonnegative().optional(),

    // Client Details
    clientOrganization: z.string().max(255).optional(),
    clients: z.array(z.object({
        clientName: z.string().min(1, 'Client name is required'),
        clientDesignation: z.string().optional(),
        clientMobile: z.string().max(50).optional(),
        clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    })).min(1, 'At least one client is required'),

    // Address & Remarks
    courierAddress: z.string().max(1000).optional(),
    teRemark: z.string().max(1000).optional(),
});
