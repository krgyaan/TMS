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

// Helper to extract document names from objects or return strings as-is
const extractDocumentNames = (val: (string | { id?: number; documentName: string } | { id?: string | number; value?: string | number;[key: string]: any })[] | null | undefined): string[] => {
    if (!val || !Array.isArray(val)) return [];
    return val
        .map(item => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null) {
                // For document objects, prefer documentName over id
                if ('documentName' in item && item.documentName != null) {
                    return String(item.documentName);
                }
                // Fallback to id, value, or first string/number property
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
    processingFeeAmount: 0,

    tenderFeeRequired: undefined,
    tenderFeeModes: [],
    tenderFeeAmount: tender?.tenderFees ? toNumber(tender.tenderFees) : 0,

    emdRequired: undefined,
    emdModes: [],
    emdAmount: tender?.emd ? toNumber(tender.emd) : 0,

    tenderValue: tender?.gstValues ? toNumber(tender.gstValues) : 0,
    oemExperience: tender?.oemExperience ? tender.oemExperience as 'YES' | 'NO' : null,

    bidValidityDays: 0,
    commercialEvaluation: undefined,
    mafRequired: undefined,
    reverseAuctionApplicable: undefined,

    paymentTermsSupply: 0,
    paymentTermsInstallation: 0,

    deliveryTimeSupply: 0,
    deliveryTimeInstallationInclusive: false,
    deliveryTimeInstallation: undefined,

    pbgRequired: undefined,
    pbgForm: undefined,
    pbgPercentage: 0,
    pbgDurationMonths: 0,

    sdRequired: undefined,
    sdForm: undefined,
    securityDepositPercentage: 0,
    sdDurationMonths: 0,

    ldRequired: undefined,
    ldPercentagePerWeek: 0,
    maxLdPercentage: 0,

    physicalDocsRequired: undefined,
    physicalDocsDeadline: '',

    techEligibilityAgeYears: 0,

    workValueType: undefined,
    orderValue1: 0,
    orderValue2: 0,
    orderValue3: 0,
    customEligibilityCriteria: '',

    technicalWorkOrders: [],
    commercialDocuments: [],

    avgAnnualTurnoverCriteria: undefined,
    avgAnnualTurnoverValue: 0,
    workingCapitalCriteria: undefined,
    workingCapitalValue: 0,
    solvencyCertificateCriteria: undefined,
    solvencyCertificateValue: 0,
    netWorthCriteria: undefined,
    netWorthValue: 0,

    courierAddress: '',
    clients: [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],

    teRemark: '',
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
        teRecommendation: data.teRecommendation ?? 'YES',
        teRejectionReason: data.teRejectionReason ?? null,
        teRejectionRemarks: data.teRejectionRemarks ?? '',

        processingFeeRequired: data.processingFeeRequired ?? undefined,
        processingFeeModes: data.processingFeeMode ?? [],
        processingFeeAmount: toNumber(data.processingFeeAmount),

        tenderFeeRequired: data.tenderFeeRequired ?? undefined,
        tenderFeeModes: data.tenderFeeMode ?? [],
        tenderFeeAmount: toNumber(data.tenderFeeAmount),

        emdRequired: data.emdRequired ?? undefined,
        emdModes: data.emdMode ?? [],
        emdAmount: toNumber(data.emdAmount),

        bidValidityDays: toNumber(data.bidValidityDays),
        commercialEvaluation: data.commercialEvaluation as TenderInfoSheetFormValues['commercialEvaluation'],
        mafRequired: data.mafRequired as TenderInfoSheetFormValues['mafRequired'],
        reverseAuctionApplicable: data.reverseAuctionApplicable ?? undefined,

        paymentTermsSupply: toNumber(data.paymentTermsSupply),
        paymentTermsInstallation: toNumber(data.paymentTermsInstallation),

        deliveryTimeSupply: toNumber(data.deliveryTimeSupply),
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
        pbgPercentage: toNumber(data.pbgPercentage),
        pbgDurationMonths: toNumber(data.pbgDurationMonths),

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
        securityDepositPercentage: toNumber(data.sdPercentage),
        sdDurationMonths: toNumber(data.sdDurationMonths),

        ldRequired: data.ldRequired ?? undefined,
        ldPercentagePerWeek: toNumber(data.ldPercentagePerWeek),
        maxLdPercentage: toNumber(data.maxLdPercentage),

        physicalDocsRequired: data.physicalDocsRequired ?? undefined,
        physicalDocsDeadline: data.physicalDocsDeadline
            ? (typeof data.physicalDocsDeadline === 'string'
                ? data.physicalDocsDeadline
                : data.physicalDocsDeadline.toISOString())
            : '',

        techEligibilityAgeYears: toNumber(data.techEligibilityAge),

        workValueType: data.workValueType ?? undefined,
        orderValue1: toNumber(data.orderValue1),
        orderValue2: toNumber(data.orderValue2),
        orderValue3: toNumber(data.orderValue3),
        customEligibilityCriteria: data.customEligibilityCriteria ?? '',

        technicalWorkOrders: extractDocumentNames(data.technicalWorkOrders),
        commercialDocuments: extractDocumentNames(data.commercialDocuments),

        avgAnnualTurnoverCriteria: data.avgAnnualTurnoverType as TenderInfoSheetFormValues['avgAnnualTurnoverCriteria'],
        avgAnnualTurnoverValue: toNumber(data.avgAnnualTurnoverValue),
        workingCapitalCriteria: data.workingCapitalType as TenderInfoSheetFormValues['workingCapitalCriteria'],
        workingCapitalValue: toNumber(data.workingCapitalValue),
        solvencyCertificateCriteria: data.solvencyCertificateType as TenderInfoSheetFormValues['solvencyCertificateCriteria'],
        solvencyCertificateValue: toNumber(data.solvencyCertificateValue),
        netWorthCriteria: data.netWorthType as TenderInfoSheetFormValues['netWorthCriteria'],
        netWorthValue: toNumber(data.netWorthValue),

        courierAddress: data.courierAddress ?? '',

        clients: data.clients && data.clients.length > 0
            ? data.clients.map(client => ({
                clientName: client.clientName ?? '',
                clientDesignation: client.clientDesignation ?? '',
                clientMobile: client.clientMobile ?? '',
                clientEmail: client.clientEmail ?? '',
            }))
            : [{ clientName: '', clientDesignation: '', clientMobile: '', clientEmail: '' }],

        teRemark: data.teFinalRemark ?? '',
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
    const payload: SaveTenderInfoSheetDto = {
        tenderValue: values.tenderValue ?? null,
        oemExperience: safeYesNoValue(values.oemExperience),

        teRecommendation: values.teRecommendation,
        teRejectionReason: values.teRecommendation === 'NO' ? (values.teRejectionReason ?? null) : null,
        teRejectionRemarks: values.teRecommendation === 'NO' ? (values.teRejectionRemarks || null) : null,

        processingFeeRequired: safeYesNoValue(values.processingFeeRequired),
        processingFeeModes: (() => {
            if (values.processingFeeRequired !== 'YES' || !values.processingFeeModes?.length) return null;
            const filtered = values.processingFeeModes.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
            return filtered.length > 0 ? filtered : null;
        })(),
        processingFeeAmount: values.processingFeeRequired === 'YES'
            ? (values.processingFeeAmount ?? null)
            : null,

        tenderFeeRequired: safeYesNoValue(values.tenderFeeRequired),
        tenderFeeModes: (() => {
            if (values.tenderFeeRequired !== 'YES' || !values.tenderFeeModes?.length) return null;
            const filtered = values.tenderFeeModes.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
            return filtered.length > 0 ? filtered : null;
        })(),
        tenderFeeAmount: values.tenderFeeRequired === 'YES'
            ? (values.tenderFeeAmount ?? null)
            : null,

        emdRequired: values.emdRequired === 'YES' || values.emdRequired === 'NO' || values.emdRequired === 'EXEMPT'
            ? values.emdRequired
            : null,
        emdModes: (() => {
            if (values.emdRequired !== 'YES' || !values.emdModes?.length) return null;
            const filtered = values.emdModes.filter(mode => mode && mode !== 'undefined' && String(mode).trim().length > 0);
            return filtered.length > 0 ? filtered : null;
        })(),
        emdAmount: values.emdRequired === 'YES'
            ? (values.emdAmount ?? null)
            : null,

        bidValidityDays: safeNumber(values.bidValidityDays),
        commercialEvaluation: values.commercialEvaluation ?? null,
        mafRequired: values.mafRequired ?? null,
        reverseAuctionApplicable: safeYesNoValue(values.reverseAuctionApplicable),

        paymentTermsSupply: safeNumber(values.paymentTermsSupply),
        paymentTermsInstallation: safeNumber(values.paymentTermsInstallation),

        deliveryTimeSupply: safeNumber(values.deliveryTimeSupply),
        deliveryTimeInstallationInclusive: values.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallationDays: !values.deliveryTimeInstallationInclusive
            ? safeNumber(values.deliveryTimeInstallation)
            : null,

        pbgRequired: safeYesNoValue(values.pbgRequired),
        pbgMode: values.pbgRequired === 'YES' && values.pbgForm?.length
            ? toStringArray(values.pbgForm)
            : null,
        pbgPercentage: values.pbgRequired === 'YES' ? safeNumber(values.pbgPercentage) : null,
        pbgDurationMonths: values.pbgRequired === 'YES' ? safeNumber(values.pbgDurationMonths) : null,

        sdRequired: safeYesNoValue(values.sdRequired),
        sdMode: values.sdRequired === 'YES' && values.sdForm?.length
            ? toStringArray(values.sdForm)
            : null,
        sdPercentage: values.sdRequired === 'YES' ? safeNumber(values.securityDepositPercentage) : null,
        sdDurationMonths: values.sdRequired === 'YES' ? safeNumber(values.sdDurationMonths) : null,

        ldRequired: safeYesNoValue(values.ldRequired),
        ldPercentagePerWeek: safeNumber(values.ldPercentagePerWeek),
        maxLdPercentage: safeNumber(values.maxLdPercentage),

        physicalDocsRequired: safeYesNoValue(values.physicalDocsRequired),
        physicalDocsDeadline: values.physicalDocsRequired === 'YES'
            ? (values.physicalDocsDeadline || null)
            : null,

        techEligibilityAge: safeNumber(values.techEligibilityAgeYears),

        workValueType: values.workValueType ?? null,
        orderValue1: values.workValueType === 'WORKS_VALUES' ? safeNumber(values.orderValue1) : null,
        orderValue2: values.workValueType === 'WORKS_VALUES' ? safeNumber(values.orderValue2) : null,
        orderValue3: values.workValueType === 'WORKS_VALUES' ? safeNumber(values.orderValue3) : null,
        customEligibilityCriteria: values.workValueType === 'CUSTOM'
            ? (values.customEligibilityCriteria || null)
            : null,

        technicalWorkOrders: values.technicalWorkOrders?.length ? toStringArray(values.technicalWorkOrders) : null,
        commercialDocuments: values.commercialDocuments?.length ? toStringArray(values.commercialDocuments) : null,

        avgAnnualTurnoverType: values.avgAnnualTurnoverCriteria ?? null,
        avgAnnualTurnoverValue: values.avgAnnualTurnoverCriteria === 'AMOUNT'
            ? safeNumber(values.avgAnnualTurnoverValue)
            : null,
        workingCapitalType: values.workingCapitalCriteria ?? null,
        workingCapitalValue: values.workingCapitalCriteria === 'AMOUNT'
            ? safeNumber(values.workingCapitalValue)
            : null,
        solvencyCertificateType: values.solvencyCertificateCriteria ?? null,
        solvencyCertificateValue: values.solvencyCertificateCriteria === 'AMOUNT'
            ? safeNumber(values.solvencyCertificateValue)
            : null,
        netWorthType: values.netWorthCriteria ?? null,
        netWorthValue: values.netWorthCriteria === 'AMOUNT'
            ? safeNumber(values.netWorthValue)
            : null,

        courierAddress: values.courierAddress || null,

        clients: values.clients.map(client => ({
            clientName: client.clientName,
            clientDesignation: client.clientDesignation || null,
            clientMobile: client.clientMobile || null,
            clientEmail: client.clientEmail || null,
        })),

        teFinalRemark: values.teRemark || null,
    };

    // Clean and return payload
    return cleanPayload(payload);
};
