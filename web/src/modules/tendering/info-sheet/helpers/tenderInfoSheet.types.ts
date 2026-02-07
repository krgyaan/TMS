import { z } from 'zod';
import { TenderInformationFormSchema } from './tenderInfoSheet.schema';

// Form Values Type (inferred from Zod schema)
export type TenderInfoSheetFormValues = z.infer<typeof TenderInformationFormSchema>;

// Client DTO (for API payload)
export interface TenderClientDto {
    clientName: string;
    clientDesignation: string | null;
    clientMobile: string | null;
    clientEmail: string | null;
}

// Client type (for responses, includes id)
export interface TenderClient {
    id?: number;
    clientName: string;
    clientDesignation?: string | null;
    clientMobile?: string | null;
    clientEmail?: string | null;
}

// Save/Update DTO - what we send to API
export interface SaveTenderInfoSheetDto {
    oemExperience: 'YES' | 'NO' | null;
    tenderValue: number | null;

    teRecommendation: 'YES' | 'NO';
    teRejectionReason: number | null;
    teRejectionRemarks: string | null;

    processingFeeRequired: 'YES' | 'NO' | null;
    processingFeeModes: string[] | null;
    processingFeeAmount: number | null;

    tenderFeeRequired: 'YES' | 'NO' | null;
    tenderFeeModes: string[] | null;
    tenderFeeAmount: number | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdModes: string[] | null;
    emdAmount: number | null;

    bidValidityDays: number | null;
    commercialEvaluation: string | null;
    mafRequired: string | null;
    reverseAuctionApplicable: 'YES' | 'NO' | null;

    paymentTermsSupply: number | null;
    paymentTermsInstallation: number | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallationInclusive: boolean;
    deliveryTimeInstallationDays: number | null;

    pbgRequired: 'YES' | 'NO' | null;
    pbgMode: string[] | null;
    pbgPercentage: number | null;
    pbgDurationMonths: number | null;

    sdRequired: 'YES' | 'NO' | null;
    sdMode: string[] | null;
    sdPercentage: number | null;
    sdDurationMonths: number | null;

    ldRequired: 'YES' | 'NO' | null;
    ldPercentagePerWeek: number | null;
    maxLdPercentage: number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | null;

    techEligibilityAge: number | null;
    workValueType: 'WORKS_VALUES' | 'CUSTOM' | null;
    orderValue1: number | null;
    orderValue2: number | null;
    orderValue3: number | null;
    customEligibilityCriteria: string | null;

    technicalWorkOrders: string[] | null;
    commercialDocuments: string[] | null;

    avgAnnualTurnoverType: string | null;
    avgAnnualTurnoverValue: number | null;
    workingCapitalType: string | null;
    workingCapitalValue: number | null;
    solvencyCertificateType: string | null;
    solvencyCertificateValue: number | null;
    netWorthType: string | null;
    netWorthValue: number | null;

    courierAddress: string | null;
    clients: TenderClientDto[];

    teFinalRemark: string | null;
}

// Response from API - what we receive
export interface TenderInfoSheetResponse {
    id: number;
    tenderId: number;

    teRecommendation: 'YES' | 'NO';
    teRejectionReason: number | null;
    teRejectionRemarks: string | null;

    processingFeeRequired: 'YES' | 'NO' | null;
    processingFeeMode: string[] | null;
    processingFeeAmount: string | number | null;

    tenderFeeRequired: 'YES' | 'NO' | null;
    tenderFeeMode: string[] | null;
    tenderFeeAmount: string | number | null;

    emdRequired: 'YES' | 'NO' | 'EXEMPT' | null;
    emdMode: string[] | null;
    emdAmount: string | number | null;

    tenderValue: string | number | null;

    bidValidityDays: number | null;
    commercialEvaluation: string | null;
    mafRequired: string | null;
    reverseAuctionApplicable: 'YES' | 'NO' | null;

    paymentTermsSupply: number | null;
    paymentTermsInstallation: number | null;

    deliveryTimeSupply: number | null;
    deliveryTimeInstallationInclusive: boolean | null;
    deliveryTimeInstallationDays: number | null;

    pbgRequired: 'YES' | 'NO' | null;
    pbgMode: string[] | null;
    pbgPercentage: string | number | null;
    pbgDurationMonths: number | null;

    sdRequired: 'YES' | 'NO' | null;
    sdMode: string[] | null;
    sdPercentage: string | number | null;
    sdDurationMonths: number | null;

    ldRequired: 'YES' | 'NO' | null;
    ldPercentagePerWeek: string | number | null;
    maxLdPercentage: string | number | null;

    physicalDocsRequired: 'YES' | 'NO' | null;
    physicalDocsDeadline: string | Date | null;

    techEligibilityAge: number | null;
    oemExperience: 'YES' | 'NO' | null;
    workValueType: 'WORKS_VALUES' | 'CUSTOM' | null;
    orderValue1: string | number | null;
    orderValue2: string | number | null;
    orderValue3: string | number | null;
    customEligibilityCriteria: string | null;

    technicalWorkOrders: Array<{ id?: number; documentName: string }> | string[] | null;
    commercialDocuments: Array<{ id?: number; documentName: string }> | string[] | null;

    avgAnnualTurnoverType: string | null;
    avgAnnualTurnoverValue: string | number | null;
    workingCapitalType: string | null;
    workingCapitalValue: string | number | null;
    solvencyCertificateType: string | null;
    solvencyCertificateValue: string | number | null;
    netWorthType: string | null;
    netWorthValue: string | number | null;

    courierAddress: string | null;

    clients: Array<{
        id?: number;
        clientName: string | null;
        clientDesignation: string | null;
        clientMobile: string | null;
        clientEmail: string | null;
    }>;

    teFinalRemark: string | null;

    createdAt: string;
    updatedAt: string;
}

// Type alias for backward compatibility (used in InfoSheetView and other places)
export type TenderInfoSheet = TenderInfoSheetResponse;

// Work Value Type Options
export const workValueTypeOptions = [
    { value: 'WORKS_VALUES', label: 'Works Values' },
    { value: 'CUSTOM', label: 'Custom' },
] as const;

export const yesNoOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
];

export const emdRequiredOptions = [
    { value: 'YES', label: 'Yes' },
    { value: 'NO', label: 'No' },
    { value: 'EXEMPT', label: 'Exempt' },
];

export const processingFeeOptions = [
    { vlaue: "DD", label: "Demand Draft" },
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
];

export const tenderFeeOptions = [
    { vlaue: "DD", label: "Demand Draft" },
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
];

export const paymentModeOptions = [
    { value: 'DD', label: 'Demand Draft' },
    { value: 'POP', label: 'Pay on Portal' },
    { value: 'BT', label: 'Bank Transfer' },
    { value: 'FDR', label: 'Fixed Deposit Receipt' },
    { value: 'BG', label: 'Bank Guarantee' },
    { value: 'SB', label: 'Surety Bond' },
];

export const paymentTermsOptions = Array.from({ length: 21 }, (_, i) => ({
    value: i * 5,
    label: `${i * 5}%`,
}));

export const bidValidityOptions = Array.from({ length: 367 }, (_, i) => ({
    value: i,
    label: `${i} ${i === 1 ? 'day' : 'days'}`,
}));

export const commercialEvaluationOptions = [
    { value: 'ITEM_WISE_GST_INCLUSIVE', label: 'Item Wise GST Inclusive' },
    { value: 'ITEM_WISE_PRE_GST', label: 'Item Wise Pre GST' },
    { value: 'OVERALL_GST_INCLUSIVE', label: 'Overall GST Inclusive' },
    { value: 'OVERALL_PRE_GST', label: 'Overall Pre GST' },
];

export const mafRequiredOptions = [
    { value: 'YES_GENERAL', label: 'Yes - General' },
    { value: 'YES_PROJECT_SPECIFIC', label: 'Yes - Project Specific' },
    { value: 'NO', label: 'No' },
];

export const pbgFormOptions = [
    { value: 'DD', label: 'DD/Deduction' },
    { value: 'FDR', label: 'Fixed Deposit Receipt' },
    { value: 'PBG', label: 'Performance Bank Guarantee' },
    { value: 'SB', label: 'Surety Bond' },
];

export const sdFormOptions = [
    { value: 'DD', label: 'DD/Deduction' },
    { value: 'FDR', label: 'Fixed Deposit Receipt' },
    { value: 'PBG', label: 'Performance Bank Guarantee' },
    { value: 'SB', label: 'Surety Bond' },
];

export const pbgDurationOptions = Array.from({ length: 121 }, (_, i) => ({
    value: i,
    label: `${i} ${i === 1 ? 'month' : 'months'}`,
}));

export const ldPerWeekOptions = Array.from({ length: 11 }, (_, i) => ({
    value: i * 0.5,
    label: `${(i * 0.5).toFixed(1)}%`,
}));

export const maxLdOptions = Array.from({ length: 21 }, (_, i) => ({
    value: i,
    label: `${i}%`,
}));

export const aatOptions = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
    { value: 'AMOUNT', label: 'Amount' },
];

export const scOptions = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
    { value: 'AMOUNT', label: 'Amount' },
];

export const wcOptions = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
    { value: 'POSITIVE', label: 'Positive' },
    { value: 'AMOUNT', label: 'Amount' },
];

export const nwOptions = [
    { value: 'NOT_APPLICABLE', label: 'Not Applicable' },
    { value: 'POSITIVE', label: 'Positive' },
    { value: 'AMOUNT', label: 'Amount' },
];

export const rejectionReasonOptions = [
    { value: '9', label: 'Status 9' },
    { value: '10', label: 'Status 10' },
    { value: '11', label: 'Status 11' },
    { value: '12', label: 'Status 12' },
    { value: '13', label: 'Status 13' },
    { value: '14', label: 'Status 14' },
    { value: '15', label: 'Status 15' },
    { value: '29', label: 'Status 29' },
    { value: '30', label: 'Status 30' },
    { value: '35', label: 'Status 35' },
    { value: '36', label: 'Status 36' },
];

// Dummy Master Documents (replace later with API call)
export const dummyTechnicalDocuments = [
    { value: '1', label: 'Technical Specification Document' },
    { value: '2', label: 'Product Catalog' },
    { value: '3', label: 'Test Certificates' },
    { value: '4', label: 'Quality Certifications (ISO, etc.)' },
    { value: '5', label: 'OEM Authorization' },
    { value: '6', label: 'Similar Work Experience Certificates' },
    { value: '7', label: 'Installation Manual' },
];

export const dummyFinancialDocuments = [
    { value: '1', label: 'Balance Sheet (Last 3 Years)' },
    { value: '2', label: 'Profit & Loss Statement' },
    { value: '3', label: 'Income Tax Returns' },
    { value: '4', label: 'GST Registration Certificate' },
    { value: '5', label: 'PAN Card' },
    { value: '6', label: 'Audited Financial Statements' },
    { value: '7', label: 'Bank Solvency Certificate' },
    { value: '8', label: 'Working Capital Certificate' },
];

export const dummyPqcDocuments = [
    { value: '1', label: 'Company Registration Certificate' },
    { value: '2', label: 'GST Certificate' },
    { value: '3', label: 'PAN Card' },
    { value: '4', label: 'Partnership Deed / MOA & AOA' },
    { value: '5', label: 'Authorized Signatory List' },
    { value: '6', label: 'Power of Attorney' },
    { value: '7', label: 'MSME Certificate (if applicable)' },
];
