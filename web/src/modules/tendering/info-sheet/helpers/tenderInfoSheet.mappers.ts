import type {
    TenderInfoSheetFormValues,
    TenderInfoSheetResponse,
    SaveTenderInfoSheetDto,
} from './tenderInfoSheet.types';
import type { TenderInfoWithNames } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

// Helper to convert string/number to number
const toNumber = (val: string | number | null | undefined, defaultValue = 0): number => {
    if (val === null || val === undefined) return defaultValue;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val));
    return isNaN(num) ? defaultValue : num;
};

// For numeric FORM fields: a null / missing / unparseable value means "not stated" and
// stays undefined (the input renders empty) -- never 0. A stored 0 is kept as 0.
export const toOptionalNumber = (val: string | number | null | undefined): number | undefined => {
    if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return undefined;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
};

// Seeds from the tender record (gstValues / tenderFees / emd). Those columns are NOT NULL
// DEFAULT 0 in tender_infos, so 0 there means "never entered", not a real amount.
export const toSeedAmount = (val: string | number | null | undefined): number | undefined => {
    const num = toOptionalNumber(val);
    return num !== undefined && num > 0 ? num : undefined;
};

// Helper to extract document names from objects or return strings as-is
const extractDocumentNames = (val: (string | { id?: number; documentName: string } | { id?: string | number; value?: string | number;[key: string]: any })[] | null | undefined): string[] => {
    if (!val || !Array.isArray(val)) return [];
    return val
        .map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
                // Prioritize ID as the value to match dropdown option values
                if ('id' in item && item.id != null) {
                    return String(item.id);
                }
                // Fallback to names if ID is missing (for legacy or unusual data)
                if ('projectName' in item && item.projectName != null) {
                    return String(item.projectName);
                }
                if ('documentName' in item && item.documentName != null) {
                    return String(item.documentName);
                }
                if ('value' in item && item.value != null) return String(item.value);
                // Fallback: try to find first string/number property
                for (const [, value] of Object.entries(item)) {
                    if (typeof value === 'string' || typeof value === 'number') {
                        return String(value);
                    }
                }
            }
            return item != null ? String(item) : null;
        })
        .filter((item): item is string => item !== null && item !== undefined && item !== 'undefined' && String(item).trim().length > 0);
};

const toStringArray = (val: (string | { id?: string | number; value?: string | number;[key: string]: any })[] | null | undefined): string[] => {
    if (!val || !Array.isArray(val)) return [];
    return val
        .map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
                // Try to extract id, value, or first string/number property
                if ('id' in item && item.id != null) return String(item.id);
                if ('value' in item && item.value != null) return String(item.value);
                // Fallback: try to find first string/number property
                for (const [, value] of Object.entries(item)) {
                    if (typeof value === 'string' || typeof value === 'number') {
                        return String(value);
                    }
                }
            }
            return item != null ? String(item) : null;
        })
        .filter((item): item is string => item !== null && item !== undefined && item !== 'undefined' && String(item).trim().length > 0);
};

// Default form values
export const buildDefaultValues = (tender?: TenderInfoWithNames | null): TenderInfoSheetFormValues => ({
    teRecommendation: 'YES',
    teRejectionReason: null,
    teRejectionRemarks: '',

    processingFeeRequired: undefined,
    processingFeeModes: [],
    processingFeeAmount: undefined,

    tenderFeeRequired: undefined,
    tenderFeeModes: [],
    tenderFeeAmount: toSeedAmount(tender?.tenderFees),

    emdRequired: undefined,
    emdModes: [],
    emdAmount: toSeedAmount(tender?.emd),

    tenderValue: toSeedAmount(tender?.gstValues),
    oemExperience: tender?.oemExperience ? tender.oemExperience as 'YES' | 'NO' : null,

    bidValidityDays: undefined,
    commercialEvaluation: undefined,
    mafRequired: undefined,
    reverseAuctionApplicable: undefined,

    paymentTermsSupply: undefined,
    paymentTermsInstallation: undefined,

    deliveryTimeSupply: undefined,
    deliveryTimeInstallationInclusive: false,
    deliveryTimeInstallation: undefined,

    pbgRequired: undefined,
    pbgForm: undefined,
    pbgPercentage: undefined,
    pbgDurationMonths: undefined,

    sdRequired: undefined,
    sdForm: undefined,
    securityDepositPercentage: undefined,
    sdDurationMonths: undefined,

    ldRequired: undefined,
    ldPercentagePerWeek: undefined,
    maxLdPercentage: undefined,

    physicalDocsRequired: undefined,
    physicalDocType: undefined,
    physicalDocsDeadline: '',
    preBidMeeting: '',
    siteVisit: '',
    sampleSubmission: '',

    techEligibilityAgeYears: undefined,

    workValueType: undefined,
    orderValue1: undefined,
    orderValue2: undefined,
    orderValue3: undefined,
    customEligibilityCriteria: '',

    technicalWorkOrders: [],
    commercialDocuments: [],

    avgAnnualTurnoverCriteria: undefined,
    avgAnnualTurnoverValue: undefined,
    workingCapitalCriteria: undefined,
    workingCapitalValue: undefined,
    solvencyCertificateCriteria: undefined,
    solvencyCertificateValue: undefined,
    netWorthCriteria: undefined,
    netWorthValue: undefined,

    courierAddress: '',
    courierName: '',
    courierPhone: '',
    courierAddressLine1: '',
    courierAddressLine2: '',
    courierCity: '',
    courierState: '',
    courierPincode: '',

    clientDetailsPresent: 'YES',
    customerInContact: 'YES',
    courierDetailsPresent: 'YES',
    // Default to one empty client box
    clients: [
        {
            clientName: '',
            clientDesignation: '',
            clientMobile: '',
            clientEmail: '',
        },
    ],

    teRemark: '',
    teRejectionProof: [],
});

// Map API response to form values
export const mapResponseToForm = (
    data: TenderInfoSheetResponse | null,
    tender?: TenderInfoWithNames | null
): TenderInfoSheetFormValues => {
    if (!data) {
        return buildDefaultValues(tender);
    }

    return {
        teRecommendation: (data.teRecommendation?.trim().toUpperCase() as 'YES' | 'NO') ?? 'YES',
        teRejectionReason: data.teRejectionReason ? toNumber(data.teRejectionReason) : null,
        teRejectionRemarks: data.teRejectionRemarks ?? '',

        processingFeeRequired: (data.processingFeeRequired?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,
        processingFeeModes: data.processingFeeMode ?? [],
        processingFeeAmount: toOptionalNumber(data.processingFeeAmount),

        tenderFeeRequired: (data.tenderFeeRequired?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,
        tenderFeeModes: data.tenderFeeMode ?? [],
        tenderFeeAmount: toOptionalNumber(data.tenderFeeAmount),

        emdRequired: (data.emdRequired?.trim().toUpperCase() as 'YES' | 'NO' | 'EXEMPT') ?? undefined,
        emdModes: data.emdMode ?? [],
        emdAmount: toOptionalNumber(data.emdAmount),
        tenderValue: toOptionalNumber(data.tenderValue),

        bidValidityDays: data.bidValidityDays != null ? toNumber(data.bidValidityDays) : undefined,
        commercialEvaluation: (data.commercialEvaluation?.trim() ?? undefined) as TenderInfoSheetFormValues['commercialEvaluation'],
        mafRequired: (data.mafRequired?.trim() ?? undefined) as TenderInfoSheetFormValues['mafRequired'],
        reverseAuctionApplicable: (data.reverseAuctionApplicable?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,

        paymentTermsSupply: toOptionalNumber(data.paymentTermsSupply),
        paymentTermsInstallation: toOptionalNumber(data.paymentTermsInstallation),

        deliveryTimeSupply: toOptionalNumber(data.deliveryTimeSupply),
        deliveryTimeInstallationInclusive: data.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallation: data.deliveryTimeInstallationDays != null ? toNumber(data.deliveryTimeInstallationDays) : undefined,

        pbgRequired: data.pbgRequired ?? undefined,
        pbgForm: (() => {
            if (!data.pbgMode) return [];
            if (Array.isArray(data.pbgMode)) return data.pbgMode;
            // Try to parse as JSON string
            try {
                const parsed = JSON.parse(String(data.pbgMode));
                return Array.isArray(parsed) ? parsed : [data.pbgMode];
            } catch {
                return [data.pbgMode];
            }
        })(),
        pbgPercentage: toOptionalNumber(data.pbgPercentage),
        pbgDurationMonths: toOptionalNumber(data.pbgDurationMonths),

        sdRequired: data.sdRequired ?? undefined,
        sdForm: (() => {
            if (!data.sdMode) return [];
            if (Array.isArray(data.sdMode)) return data.sdMode;
            // Try to parse as JSON string
            try {
                const parsed = JSON.parse(String(data.sdMode));
                return Array.isArray(parsed) ? parsed : [data.sdMode];
            } catch {
                return [data.sdMode];
            }
        })(),
        securityDepositPercentage: toOptionalNumber(data.sdPercentage),
        sdDurationMonths: toOptionalNumber(data.sdDurationMonths),

        ldRequired: data.ldRequired ?? undefined,
        ldPercentagePerWeek: toOptionalNumber(data.ldPercentagePerWeek),
        maxLdPercentage: toOptionalNumber(data.maxLdPercentage),

        physicalDocsRequired: data.physicalDocsRequired ?? undefined,
        physicalDocType: (data.physicalDocType?.trim() ?? undefined) as TenderInfoSheetFormValues['physicalDocType'],
        physicalDocsDeadline: data.physicalDocsDeadline
            ? (typeof data.physicalDocsDeadline === 'string'
                ? data.physicalDocsDeadline
                : data.physicalDocsDeadline.toISOString())
            : '',
        preBidMeeting: data.preBidMeeting ?? '',
        siteVisit: data.siteVisit ?? '',
        sampleSubmission: data.sampleSubmission ?? '',

        techEligibilityAgeYears: toOptionalNumber(data.techEligibilityAge),
        oemExperience: data.oemExperience as 'YES' | 'NO' | null,

        workValueType: data.workValueType ?? undefined,
        orderValue1: toOptionalNumber(data.orderValue1),
        orderValue2: toOptionalNumber(data.orderValue2),
        orderValue3: toOptionalNumber(data.orderValue3),
        customEligibilityCriteria: data.customEligibilityCriteria ?? '',

        technicalWorkOrders: extractDocumentNames(data.technicalWorkOrders),
        commercialDocuments: extractDocumentNames(data.commercialDocuments),

        avgAnnualTurnoverCriteria: (data.avgAnnualTurnoverType?.trim() ?? undefined) as TenderInfoSheetFormValues['avgAnnualTurnoverCriteria'],
        avgAnnualTurnoverValue: toOptionalNumber(data.avgAnnualTurnoverValue),
        workingCapitalCriteria: (data.workingCapitalType?.trim() ?? undefined) as TenderInfoSheetFormValues['workingCapitalCriteria'],
        workingCapitalValue: toOptionalNumber(data.workingCapitalValue),
        solvencyCertificateCriteria: (data.solvencyCertificateType?.trim() ?? undefined) as TenderInfoSheetFormValues['solvencyCertificateCriteria'],
        solvencyCertificateValue: toOptionalNumber(data.solvencyCertificateValue),
        netWorthCriteria: (data.netWorthType?.trim() ?? undefined) as TenderInfoSheetFormValues['netWorthCriteria'],
        netWorthValue: toOptionalNumber(data.netWorthValue),

        courierAddress: data.courierAddress ?? '',
        courierName: data.courierName ?? '',
        courierPhone: data.courierPhone ?? '',
        courierAddressLine1: data.courierAddressLine1 ?? '',
        courierAddressLine2: data.courierAddressLine2 ?? '',
        courierCity: data.courierCity ?? '',
        courierState: data.courierState ?? '',
        courierPincode: data.courierPincode ?? '',

        clientDetailsPresent: (data.clientDetailsPresent?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,
        customerInContact: (data.customerInContact?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,
        courierDetailsPresent: (data.courierDetailsPresent?.trim().toUpperCase() as 'YES' | 'NO') ?? undefined,

        // Map existing clients, otherwise use one default empty client
        clients: data.clients && data.clients.length > 0
            ? data.clients.map(client => ({
                clientName: client.clientName ?? '',
                clientDesignation: client.clientDesignation ?? '',
                clientMobile: client.clientMobile ?? '',
                clientEmail: client.clientEmail ?? '',
            }))
            : [
                {
                    clientName: '',
                    clientDesignation: '',
                    clientMobile: '',
                    clientEmail: '',
                },
            ],

        teRemark: data.teFinalRemark ?? '',
        teRejectionProof: toStringArray(data.teRejectionProof)
    };
};

// Helper to safely convert YES/NO enum values
const safeYesNoValue = (value: 'YES' | 'NO' | undefined | null | string): 'YES' | 'NO' | null => {
    // Return null for falsy values (null, undefined, empty string, etc.)
    if (value === null || value === undefined || value === '') {
        return null;
    }

    // Always convert to string first, then trim and uppercase
    const stringValue = String(value).trim().toUpperCase();

    // Check for valid YES/NO values
    if (stringValue === 'YES' || stringValue === 'NO') {
        return stringValue as 'YES' | 'NO';
    }

    // Log warning for invalid values
    if (stringValue.length > 0) {
        console.warn(`Invalid YES/NO value detected: "${value}" (normalized: "${stringValue}")`);
    }

    // Return null for any invalid value
    return null;
};

// Helper to convert number to null if 0 or undefined
// Numbers where 0 is a genuine value (e.g. 0% installation payment): only "not stated"
// becomes null.
const nullableNumber = (value: number | null | undefined): number | null =>
    value === null || value === undefined || Number.isNaN(value) ? null : value;

const safeNumber = (value: number | null | undefined): number | null => {
    if (value === null || value === undefined || value === 0) {
        return null;
    }
    return value;
};

// Clean payload: ensure all YES/NO fields are valid
const cleanPayload = (payload: SaveTenderInfoSheetDto): SaveTenderInfoSheetDto => {
    const cleaned = { ...payload };

    // List of YES/NO fields that must be 'YES', 'NO', or null
    const yesNoFields: (keyof SaveTenderInfoSheetDto)[] = [
        'processingFeeRequired',
        'tenderFeeRequired',
        'pbgRequired',
        'sdRequired',
        'ldRequired',
        'physicalDocsRequired',
        'reverseAuctionApplicable',
        'oemExperience',
        'clientDetailsPresent',
        'customerInContact',
        'courierDetailsPresent',
    ];

    // Validate and clean YES/NO fields
    yesNoFields.forEach(field => {
        const value = cleaned[field];
        if (value !== null && value !== 'YES' && value !== 'NO' && value !== undefined) {
            // If invalid value, set to null
            console.warn(`Invalid value for ${field}: ${JSON.stringify(value)}, setting to null`);
            (cleaned as any)[field] = null;
        }
    });

    return cleaned;
};

// Map form values to API payload
export const mapFormToPayload = (values: TenderInfoSheetFormValues): SaveTenderInfoSheetDto => {
    // ─── When NO: only send rejection-related fields ───────────────────────────
    if (values.teRecommendation === 'NO') {
        return cleanPayload({
            // Rejection fields
            teRecommendation: 'NO',
            teRejectionReason: values.teRejectionReason ?? null,
            teRejectionRemarks: values.teRejectionRemarks || null,
            teRejectionProof:
                values.teRejectionProof?.length
                    ? toStringArray(values.teRejectionProof)
                    : null,

            // Everything else → null / empty
            tenderValue: null,
            oemExperience: null,
            processingFeeRequired: null,
            processingFeeModes: null,
            processingFeeAmount: null,
            tenderFeeRequired: null,
            tenderFeeModes: null,
            tenderFeeAmount: null,
            emdRequired: null,
            emdModes: null,
            emdAmount: null,
            bidValidityDays: null,
            commercialEvaluation: null,
            mafRequired: null,
            reverseAuctionApplicable: null,
            paymentTermsSupply: null,
            paymentTermsInstallation: null,
            deliveryTimeSupply: null,
            deliveryTimeInstallationInclusive: false,
            deliveryTimeInstallationDays: null,
            pbgRequired: null,
            pbgMode: null,
            pbgPercentage: null,
            pbgDurationMonths: null,
            sdRequired: null,
            sdMode: null,
            sdPercentage: null,
            sdDurationMonths: null,
            ldRequired: null,
            ldPercentagePerWeek: null,
            maxLdPercentage: null,
            physicalDocsRequired: null,
            physicalDocType: null,
            physicalDocsDeadline: null,
            preBidMeeting: null,
            siteVisit: null,
            sampleSubmission: null,
            techEligibilityAge: null,
            workValueType: null,
            orderValue1: null,
            orderValue2: null,
            orderValue3: null,
            customEligibilityCriteria: null,
            technicalWorkOrders: null,
            commercialDocuments: null,
            avgAnnualTurnoverType: null,
            avgAnnualTurnoverValue: null,
            workingCapitalType: null,
            workingCapitalValue: null,
            solvencyCertificateType: null,
            solvencyCertificateValue: null,
            netWorthType: null,
            netWorthValue: null,
            courierAddress: null,
            courierName: null,
            courierPhone: null,
            courierAddressLine1: null,
            courierAddressLine2: null,
            courierCity: null,
            courierState: null,
            courierPincode: null,
            clientDetailsPresent: null,
            customerInContact: null,
            courierDetailsPresent: null,
            clients: [],
            teFinalRemark: null,
        });
    }

    // ─── When YES: existing full mapping logic (unchanged) ─────────────────────
    const payload: SaveTenderInfoSheetDto = {
        tenderValue: values.tenderValue ?? null,
        oemExperience: safeYesNoValue(values.oemExperience),

        teRecommendation: 'YES',
        teRejectionReason: null,       // always null when YES
        teRejectionRemarks: null,      // always null when YES
        teRejectionProof: null,        // always null when YES

        processingFeeRequired: safeYesNoValue(values.processingFeeRequired),
        processingFeeModes: (() => {
            if (
                values.processingFeeRequired !== 'YES' ||
                !values.processingFeeModes?.length
            )
                return null;
            const filtered = values.processingFeeModes.filter(
                (mode) =>
                    mode && mode !== 'undefined' && String(mode).trim().length > 0
            );
            return filtered.length > 0 ? filtered : null;
        })(),
        processingFeeAmount:
            values.processingFeeRequired === 'YES'
                ? (values.processingFeeAmount ?? null)
                : null,

        tenderFeeRequired: safeYesNoValue(values.tenderFeeRequired),
        tenderFeeModes: (() => {
            if (
                values.tenderFeeRequired !== 'YES' ||
                !values.tenderFeeModes?.length
            )
                return null;
            const filtered = values.tenderFeeModes.filter(
                (mode) =>
                    mode && mode !== 'undefined' && String(mode).trim().length > 0
            );
            return filtered.length > 0 ? filtered : null;
        })(),
        tenderFeeAmount:
            values.tenderFeeRequired === 'YES'
                ? (values.tenderFeeAmount ?? null)
                : null,

        emdRequired:
            values.emdRequired === 'YES' ||
            values.emdRequired === 'NO' ||
            values.emdRequired === 'EXEMPT'
                ? values.emdRequired
                : null,
        emdModes: (() => {
            if (values.emdRequired !== 'YES' || !values.emdModes?.length)
                return null;
            const filtered = values.emdModes.filter(
                (mode) =>
                    mode && mode !== 'undefined' && String(mode).trim().length > 0
            );
            return filtered.length > 0 ? filtered : null;
        })(),
        emdAmount:
            values.emdRequired === 'YES' ? (values.emdAmount ?? null) : null,

        bidValidityDays: safeNumber(values.bidValidityDays),
        commercialEvaluation: values.commercialEvaluation ?? null,
        mafRequired: values.mafRequired ?? null,
        reverseAuctionApplicable: safeYesNoValue(values.reverseAuctionApplicable),

        paymentTermsSupply: nullableNumber(values.paymentTermsSupply),
        paymentTermsInstallation: nullableNumber(values.paymentTermsInstallation),

        deliveryTimeSupply: safeNumber(values.deliveryTimeSupply),
        deliveryTimeInstallationInclusive:
            values.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallationDays: !values.deliveryTimeInstallationInclusive
            ? safeNumber(values.deliveryTimeInstallation)
            : null,

        pbgRequired: safeYesNoValue(values.pbgRequired),
        pbgMode:
            values.pbgRequired === 'YES' && values.pbgForm?.length
                ? toStringArray(values.pbgForm)
                : null,
        pbgPercentage:
            values.pbgRequired === 'YES'
                ? safeNumber(values.pbgPercentage)
                : null,
        pbgDurationMonths:
            values.pbgRequired === 'YES'
                ? safeNumber(values.pbgDurationMonths)
                : null,

        sdRequired: safeYesNoValue(values.sdRequired),
        sdMode:
            values.sdRequired === 'YES' && values.sdForm?.length
                ? toStringArray(values.sdForm)
                : null,
        sdPercentage:
            values.sdRequired === 'YES'
                ? safeNumber(values.securityDepositPercentage)
                : null,
        sdDurationMonths:
            values.sdRequired === 'YES'
                ? safeNumber(values.sdDurationMonths)
                : null,

        ldRequired: safeYesNoValue(values.ldRequired),
        ldPercentagePerWeek: safeNumber(values.ldPercentagePerWeek),
        maxLdPercentage: safeNumber(values.maxLdPercentage),

        physicalDocsRequired: safeYesNoValue(values.physicalDocsRequired),
        physicalDocType:
            values.physicalDocsRequired === 'YES'
                ? (values.physicalDocType || null)
                : null,
        physicalDocsDeadline:
            values.physicalDocsRequired === 'YES'
                ? (values.physicalDocsDeadline || null)
                : null,
        preBidMeeting: values.preBidMeeting?.trim() || null,
        siteVisit: values.siteVisit?.trim() || null,
        sampleSubmission: values.sampleSubmission?.trim() || null,

        techEligibilityAge: safeNumber(values.techEligibilityAgeYears),

        workValueType: values.workValueType ?? null,
        orderValue1:
            values.workValueType === 'WORKS_VALUES'
                ? safeNumber(values.orderValue1)
                : null,
        orderValue2:
            values.workValueType === 'WORKS_VALUES'
                ? safeNumber(values.orderValue2)
                : null,
        orderValue3:
            values.workValueType === 'WORKS_VALUES'
                ? safeNumber(values.orderValue3)
                : null,
        customEligibilityCriteria:
            values.workValueType === 'CUSTOM'
                ? (values.customEligibilityCriteria || null)
                : null,

        technicalWorkOrders: values.technicalWorkOrders?.length
            ? toStringArray(values.technicalWorkOrders)
            : null,
        commercialDocuments: values.commercialDocuments?.length
            ? toStringArray(values.commercialDocuments)
            : null,

        avgAnnualTurnoverType: values.avgAnnualTurnoverCriteria ?? null,
        avgAnnualTurnoverValue:
            values.avgAnnualTurnoverCriteria === 'AMOUNT'
                ? safeNumber(values.avgAnnualTurnoverValue)
                : null,
        workingCapitalType: values.workingCapitalCriteria ?? null,
        workingCapitalValue:
            values.workingCapitalCriteria === 'AMOUNT'
                ? safeNumber(values.workingCapitalValue)
                : null,
        solvencyCertificateType: values.solvencyCertificateCriteria ?? null,
        solvencyCertificateValue:
            values.solvencyCertificateCriteria === 'AMOUNT'
                ? safeNumber(values.solvencyCertificateValue)
                : null,
        netWorthType: values.netWorthCriteria ?? null,
        netWorthValue:
            values.netWorthCriteria === 'AMOUNT'
                ? safeNumber(values.netWorthValue)
                : null,

        courierAddress: values.courierAddress || null,
        courierName: values.courierName || null,
        courierPhone: values.courierPhone || null,
        courierAddressLine1: values.courierAddressLine1 || null,
        courierAddressLine2: values.courierAddressLine2 || null,
        courierCity: values.courierCity || null,
        courierState: values.courierState || null,
        courierPincode: values.courierPincode || null,

        clientDetailsPresent: safeYesNoValue(values.clientDetailsPresent),
        customerInContact: safeYesNoValue(values.customerInContact),
        courierDetailsPresent: safeYesNoValue(values.courierDetailsPresent),

        clients: values.clients.map((client) => ({
            clientName: client.clientName,
            clientDesignation: client.clientDesignation || null,
            clientMobile: client.clientMobile || null,
            clientEmail: client.clientEmail || null,
        })),

        teFinalRemark: values.teRemark || null,
    };

    return cleanPayload(payload);
};