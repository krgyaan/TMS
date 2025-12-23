import type {
    TenderInfoSheetFormValues,
    TenderInfoSheetResponse,
    SaveTenderInfoSheetDto,
} from './tenderInfoSheet.types';
import type { TenderInfoWithNames } from '@/types/api.types';

// Helper to convert string/number to number
const toNumber = (val: string | number | null | undefined, defaultValue = 0): number => {
    if (val === null || val === undefined) return defaultValue;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val));
    return isNaN(num) ? defaultValue : num;
};

const toStringArray = (val: (string | { id?: string | number; value?: string | number;[key: string]: any })[] | null | undefined): string[] => {
    if (!val || !Array.isArray(val)) return [];
    return val.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
            // Try to extract id, value, or first string/number property
            if ('id' in item && item.id != null) return String(item.id);
            if ('value' in item && item.value != null) return String(item.value);
            // Fallback: try to find first string/number property
            for (const [key, value] of Object.entries(item)) {
                if (typeof value === 'string' || typeof value === 'number') {
                    return String(value);
                }
            }
        }
        return String(item);
    });
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

    tenderValueGstInclusive: tender?.gstValues ? toNumber(tender.gstValues) : 0,

    bidValidityDays: 0,
    commercialEvaluation: undefined,
    mafRequired: undefined,
    reverseAuctionApplicable: undefined,

    paymentTermsSupply: 0,
    paymentTermsInstallation: 0,

    deliveryTimeSupply: 0,
    deliveryTimeInstallationInclusive: false,
    deliveryTimeInstallation: null,

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

    clientOrganization: '',
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

        tenderValueGstInclusive: toNumber(data.tenderValueGstInclusive),

        bidValidityDays: toNumber(data.bidValidityDays),
        commercialEvaluation: data.commercialEvaluation as TenderInfoSheetFormValues['commercialEvaluation'],
        mafRequired: data.mafRequired as TenderInfoSheetFormValues['mafRequired'],
        reverseAuctionApplicable: data.reverseAuctionApplicable ?? undefined,

        paymentTermsSupply: toNumber(data.paymentTermsSupply),
        paymentTermsInstallation: toNumber(data.paymentTermsInstallation),

        deliveryTimeSupply: toNumber(data.deliveryTimeSupply),
        deliveryTimeInstallationInclusive: data.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallation: data.deliveryTimeInstallationDays != null ? toNumber(data.deliveryTimeInstallationDays) : null,

        pbgRequired: data.pbgRequired ?? undefined,
        pbgForm: data.pbgMode as TenderInfoSheetFormValues['pbgForm'],
        pbgPercentage: toNumber(data.pbgPercentage),
        pbgDurationMonths: toNumber(data.pbgDurationMonths),

        sdRequired: data.sdRequired ?? undefined,
        sdForm: data.sdMode as TenderInfoSheetFormValues['sdForm'],
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

        technicalWorkOrders: toStringArray(data.technicalWorkOrders),
        commercialDocuments: toStringArray(data.commercialDocuments),

        avgAnnualTurnoverCriteria: data.avgAnnualTurnoverType as TenderInfoSheetFormValues['avgAnnualTurnoverCriteria'],
        avgAnnualTurnoverValue: toNumber(data.avgAnnualTurnoverValue),
        workingCapitalCriteria: data.workingCapitalType as TenderInfoSheetFormValues['workingCapitalCriteria'],
        workingCapitalValue: toNumber(data.workingCapitalValue),
        solvencyCertificateCriteria: data.solvencyCertificateType as TenderInfoSheetFormValues['solvencyCertificateCriteria'],
        solvencyCertificateValue: toNumber(data.solvencyCertificateValue),
        netWorthCriteria: data.netWorthType as TenderInfoSheetFormValues['netWorthCriteria'],
        netWorthValue: toNumber(data.netWorthValue),

        clientOrganization: data.clientOrganization ?? '',
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

// Map form values to API payload
export const mapFormToPayload = (values: TenderInfoSheetFormValues): SaveTenderInfoSheetDto => {
    return {
        teRecommendation: values.teRecommendation,
        teRejectionReason: values.teRecommendation === 'NO' ? (values.teRejectionReason ?? null) : null,
        teRejectionRemarks: values.teRecommendation === 'NO' ? (values.teRejectionRemarks || null) : null,

        processingFeeRequired: values.processingFeeRequired ?? null,
        processingFeeModes: values.processingFeeRequired === 'YES' && values.processingFeeModes?.length
            ? values.processingFeeModes
            : null,
        processingFeeAmount: values.processingFeeRequired === 'YES'
            ? (values.processingFeeAmount ?? null)
            : null,

        tenderFeeRequired: values.tenderFeeRequired ?? null,
        tenderFeeModes: values.tenderFeeRequired === 'YES' && values.tenderFeeModes?.length
            ? values.tenderFeeModes
            : null,
        tenderFeeAmount: values.tenderFeeRequired === 'YES'
            ? (values.tenderFeeAmount ?? null)
            : null,

        emdRequired: values.emdRequired ?? null,
        emdModes: values.emdRequired === 'YES' && values.emdModes?.length
            ? values.emdModes
            : null,
        emdAmount: values.emdRequired === 'YES'
            ? (values.emdAmount ?? null)
            : null,

        tenderValueGstInclusive: values.tenderValueGstInclusive ?? null,

        bidValidityDays: values.bidValidityDays ?? null,
        commercialEvaluation: values.commercialEvaluation ?? null,
        mafRequired: values.mafRequired ?? null,
        reverseAuctionApplicable: values.reverseAuctionApplicable ?? null,

        paymentTermsSupply: values.paymentTermsSupply ?? null,
        paymentTermsInstallation: values.paymentTermsInstallation ?? null,

        deliveryTimeSupply: values.deliveryTimeSupply ?? null,
        deliveryTimeInstallationInclusive: values.deliveryTimeInstallationInclusive ?? false,
        deliveryTimeInstallationDays: !values.deliveryTimeInstallationInclusive
            ? (values.deliveryTimeInstallation ?? null)
            : null,

        pbgRequired: values.pbgRequired ?? null,
        pbgMode: values.pbgRequired === 'YES' ? (values.pbgForm ?? null) : null,
        pbgPercentage: values.pbgRequired === 'YES' ? (values.pbgPercentage ?? null) : null,
        pbgDurationMonths: values.pbgRequired === 'YES' ? (values.pbgDurationMonths ?? null) : null,

        sdRequired: values.sdRequired ?? null,
        sdMode: values.sdRequired === 'YES' ? (values.sdForm ?? null) : null,
        sdPercentage: values.sdRequired === 'YES' ? (values.securityDepositPercentage ?? null) : null,
        sdDurationMonths: values.sdRequired === 'YES' ? (values.sdDurationMonths ?? null) : null,

        ldRequired: values.ldRequired ?? null,
        ldPercentagePerWeek: values.ldPercentagePerWeek ?? null,
        maxLdPercentage: values.maxLdPercentage ?? null,

        physicalDocsRequired: values.physicalDocsRequired ?? null,
        physicalDocsDeadline: values.physicalDocsRequired === 'YES'
            ? (values.physicalDocsDeadline || null)
            : null,

        techEligibilityAge: values.techEligibilityAgeYears ?? null,

        workValueType: values.workValueType ?? null,
        orderValue1: values.workValueType === 'WORKS_VALUES' ? (values.orderValue1 ?? null) : null,
        orderValue2: values.workValueType === 'WORKS_VALUES' ? (values.orderValue2 ?? null) : null,
        orderValue3: values.workValueType === 'WORKS_VALUES' ? (values.orderValue3 ?? null) : null,
        customEligibilityCriteria: values.workValueType === 'CUSTOM'
            ? (values.customEligibilityCriteria || null)
            : null,

        technicalWorkOrders: values.technicalWorkOrders?.length ? toStringArray(values.technicalWorkOrders) : null,
        commercialDocuments: values.commercialDocuments?.length ? toStringArray(values.commercialDocuments) : null,

        avgAnnualTurnoverType: values.avgAnnualTurnoverCriteria ?? null,
        avgAnnualTurnoverValue: values.avgAnnualTurnoverCriteria === 'AMOUNT'
            ? (values.avgAnnualTurnoverValue ?? null)
            : null,
        workingCapitalType: values.workingCapitalCriteria ?? null,
        workingCapitalValue: values.workingCapitalCriteria === 'AMOUNT'
            ? (values.workingCapitalValue ?? null)
            : null,
        solvencyCertificateType: values.solvencyCertificateCriteria ?? null,
        solvencyCertificateValue: values.solvencyCertificateCriteria === 'AMOUNT'
            ? (values.solvencyCertificateValue ?? null)
            : null,
        netWorthType: values.netWorthCriteria ?? null,
        netWorthValue: values.netWorthCriteria === 'AMOUNT'
            ? (values.netWorthValue ?? null)
            : null,

        clientOrganization: values.clientOrganization || null,
        courierAddress: values.courierAddress || null,

        clients: values.clients.map(client => ({
            clientName: client.clientName,
            clientDesignation: client.clientDesignation || null,
            clientMobile: client.clientMobile || null,
            clientEmail: client.clientEmail || null,
        })),

        teFinalRemark: values.teRemark || null,
    };
};
