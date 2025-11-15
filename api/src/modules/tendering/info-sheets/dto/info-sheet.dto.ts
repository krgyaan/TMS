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

export const TenderInfoSheetPayloadSchema = z.object({
    teRecommendation: yesNoEnum,
    teRejectionReason: optionalNumber(z.coerce.number().int().positive()),
    teRejectionRemarks: optionalString,
    teRemark: optionalString,

    tenderFeeAmount: optionalNumber(z.coerce.number().nonnegative()),
    tenderFeeMode: feeModeEnum.optional(),

    emdRequired: emdRequiredEnum.optional(),
    emdMode: emdModeEnum.optional(),

    reverseAuctionApplicable: yesNoEnum.optional(),
    paymentTermsSupply: paymentTermsEnum.optional(),
    paymentTermsInstallation: paymentTermsEnum.optional(),

    pbgRequired: yesNoEnum.optional(),
    pbgPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    pbgDurationMonths: optionalNumber(z.coerce.number().int().positive()),

    securityDepositMode: sdModeEnum.optional(),
    securityDepositPercentage: optionalNumber(z.coerce.number().min(0).max(100)),
    sdDurationMonths: optionalNumber(z.coerce.number().int().positive()),

    bidValidityDays: optionalNumber(z.coerce.number().int().positive()),
    commercialEvaluation: yesNoEnum.optional(),
    mafRequired: yesNoEnum.optional(),

    deliveryTimeSupply: optionalNumber(z.coerce.number().int().positive()),
    deliveryTimeInstallation: optionalNumber(z.coerce.number().int().positive()),

    ldPercentagePerWeek: optionalNumber(z.coerce.number().min(0).max(100)),
    maxLdPercentage: optionalNumber(z.coerce.number().min(0).max(100)),

    physicalDocsRequired: yesNoEnum.optional(),
    physicalDocsDeadline: optionalString,

    techEligibilityAgeYears: optionalNumber(z.coerce.number().int().nonnegative()),
    orderValue1: optionalNumber(z.coerce.number().nonnegative()),
    orderValue2: optionalNumber(z.coerce.number().nonnegative()),
    orderValue3: optionalNumber(z.coerce.number().nonnegative()),

    technicalEligible: z.boolean().optional().default(false),

    avgAnnualTurnoverRequired: yesNoEnum.optional(),
    avgAnnualTurnoverValue: optionalNumber(z.coerce.number().nonnegative()),

    workingCapitalRequired: yesNoEnum.optional(),
    workingCapitalValue: optionalNumber(z.coerce.number().nonnegative()),

    solvencyCertificateRequired: yesNoEnum.optional(),
    solvencyCertificateValue: optionalNumber(z.coerce.number().nonnegative()),

    netWorthRequired: yesNoEnum.optional(),
    netWorthValue: optionalNumber(z.coerce.number().nonnegative()),

    financialEligible: z.boolean().optional().default(false),

    clients: z.array(clientSchema).min(1, 'At least one client is required'),
    technicalDocuments: documentsSchema,
    financialDocuments: documentsSchema,
    pqcDocuments: documentsSchema,

    rejectionRemark: optionalString,
});

export type TenderInfoSheetPayload = z.infer<typeof TenderInfoSheetPayloadSchema>;
