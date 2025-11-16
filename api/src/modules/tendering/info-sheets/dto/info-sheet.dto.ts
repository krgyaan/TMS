import { z } from 'zod';

const yesNoEnum = z.enum(['YES', 'NO']);
const feeModeEnum = z.enum(['DD', 'POP', 'BT']);
const emdRequiredEnum = z.enum(['YES', 'NO', 'EXEMPT']);
const emdModeEnum = z.enum(['BT', 'POP', 'DD', 'FDR', 'PBG', 'SB']);
const paymentTermsEnum = z.enum(['ADVANCE', 'AGAINST_DELIVERY', 'CREDIT']);
const sdModeEnum = z.enum(['NA', 'DD', 'DEDUCTION', 'FDR', 'PBG', 'SB']);

const optionalString = z
    .union([z.string(), z.undefined()])
    .transform((value) => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length ? trimmed : undefined;
    });

const optionalNumber = (schema: z.ZodNumber = z.coerce.number()) =>
    z
        .union([schema, z.undefined(), z.literal('')])
        .transform((value) => {
            if (value === '' || typeof value === 'undefined') return undefined;
            const num = typeof value === 'number' ? value : Number(value);
            return Number.isNaN(num) ? undefined : num;
        });

const clientSchema = z.object({
    clientName: z.string().min(1, 'Client name is required').max(255),
    clientDesignation: optionalString,
    clientMobile: optionalString,
    clientEmail: optionalString,
});

const documentsSchema = z
    .array(z.string().min(1).max(255))
    .optional()
    .transform((value) => value ?? []);

const commercialEvaluationTypeEnum = z.enum([
    'ITEM_WISE_GST_INCLUSIVE',
    'ITEM_WISE_PRE_GST',
    'OVERALL_GST_INCLUSIVE',
    'OVERALL_PRE_GST'
]);

const mafRequiredTypeEnum = z.enum(['YES_GENERAL', 'YES_PROJECT_SPECIFIC', 'NO']);
const pbgSdFormEnum = z.enum(['DD_DEDUCTION', 'FDR', 'PBG', 'SB', 'NA']);
const financialCriteriaEnum = z.enum(['NOT_APPLICABLE', 'POSITIVE', 'AMOUNT']);

export const TenderInfoSheetPayloadSchema = z.object({
    teRecommendation: yesNoEnum,
    teRejectionReason: optionalNumber(z.coerce.number().int().positive()),
    teRejectionRemarks: optionalString,
    teRemark: optionalString,

    processingFeeAmount: optionalNumber(z.coerce.number().nonnegative()),
    processingFeeModes: z.array(z.string()).optional().nullable(),

    tenderFeeAmount: optionalNumber(z.coerce.number().nonnegative()),
    tenderFeeModes: z.array(z.string()).optional().nullable(),

    emdRequired: emdRequiredEnum.optional(),
    emdModes: z.array(z.string()).optional().nullable(),

    reverseAuctionApplicable: yesNoEnum.optional(),
    paymentTermsSupply: optionalNumber(z.coerce.number().min(0).max(100)),
    paymentTermsInstallation: optionalNumber(z.coerce.number().min(0).max(100)),

    bidValidityDays: optionalNumber(z.coerce.number().int().min(0).max(366)),
    commercialEvaluation: commercialEvaluationTypeEnum.optional(),
    mafRequired: mafRequiredTypeEnum.optional(),

    deliveryTimeSupply: optionalNumber(z.coerce.number().int().positive()),
    deliveryTimeInstallationInclusive: z.boolean().optional().default(false),
    deliveryTimeInstallation: optionalNumber(z.coerce.number().int().positive()),

    pbgForm: pbgSdFormEnum.optional(),
    pbgPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    pbgDurationMonths: optionalNumber(z.coerce.number().int().min(0).max(120)),

    sdForm: pbgSdFormEnum.optional(),
    securityDepositPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    sdDurationMonths: optionalNumber(z.coerce.number().int().positive()),

    ldPercentagePerWeek: optionalNumber(z.coerce.number().min(0).max(5)),
    maxLdPercentage: optionalNumber(z.coerce.number().int().min(0).max(20)),

    physicalDocsRequired: yesNoEnum.optional(),
    physicalDocsDeadline: optionalString,

    techEligibilityAgeYears: optionalNumber(z.coerce.number().int().nonnegative()),
    orderValue1: optionalNumber(z.coerce.number().nonnegative()),
    orderValue2: optionalNumber(z.coerce.number().nonnegative()),
    orderValue3: optionalNumber(z.coerce.number().nonnegative()),

    avgAnnualTurnoverCriteria: financialCriteriaEnum.optional(),
    avgAnnualTurnoverValue: optionalNumber(z.coerce.number().nonnegative()),

    workingCapitalCriteria: financialCriteriaEnum.optional(),
    workingCapitalValue: optionalNumber(z.coerce.number().nonnegative()),

    solvencyCertificateCriteria: financialCriteriaEnum.optional(),
    solvencyCertificateValue: optionalNumber(z.coerce.number().nonnegative()),

    netWorthCriteria: financialCriteriaEnum.optional(),
    netWorthValue: optionalNumber(z.coerce.number().nonnegative()),

    clientOrganization: optionalString,
    courierAddress: optionalString,

    clients: z.array(clientSchema).min(1, 'At least one client is required'),
    technicalWorkOrders: documentsSchema,
    commercialDocuments: documentsSchema,

    rejectionRemark: optionalString,
});

export type TenderInfoSheetPayload = z.infer<typeof TenderInfoSheetPayloadSchema>;
