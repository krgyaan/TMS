import { z } from 'zod';
import { TenderApprovalFormSchema } from './tenderApproval.schema';

// Form Values Type (inferred from Zod schema)
export type TenderApprovalFormValues = z.infer<typeof TenderApprovalFormSchema>;

// Incomplete Field
export interface IncompleteField {
    fieldName: string;
    comment: string;
}

// Save DTO - what we send to API
export interface SaveTenderApprovalDto {
    tlDecision: string;
    rfqTo: string[] | null;
    processingFeeMode: string | null;
    tenderFeeMode: string | null;
    emdMode: string | null;
    approvePqrSelection: string | null;
    approveFinanceDocSelection: string | null;
    alternativeTechnicalDocs: string[] | null;
    alternativeFinancialDocs: string[] | null;
    tenderStatus: string | null;
    oemNotAllowed: string | null;
    tlRejectionRemarks: string | null;
    incompleteFields: IncompleteField[] | null;
}

// Response from API
export interface TenderApproval {
    id: number;
    tenderId: number;
    tlDecision: string;
    rfqTo: string[] | null;
    processingFeeMode: string | null;
    tenderFeeMode: string | null;
    emdMode: string | null;
    approvePqrSelection: string | null;
    approveFinanceDocSelection: string | null;
    alternativeTechnicalDocs: string[] | null;
    alternativeFinancialDocs: string[] | null;
    tenderStatus: string | null;
    oemNotAllowed: string | null;
    tlRejectionRemarks: string | null;
    incompleteFields: IncompleteField[] | null;
    createdAt: string;
    updatedAt: string;
}

// Re-export from API types
export type { TenderWithRelations } from '@/types/api.types';

export const tlDecisionOptions = [
    { value: '0', label: 'Pending' },
    { value: '1', label: 'Approve - Go for Bid' },
    { value: '2', label: 'Reject - Do Not Bid' },
    { value: '3', label: 'Incomplete - Return to TE' },
];

export const documentApprovalOptions = [
    { value: '1', label: 'Approve' },
    { value: '2', label: 'Reject - Select Alternative' },
];

export const infoSheetFieldOptions = [
    // TE Recommendation
    { value: 'teRecommendation', label: 'TE Recommendation' },
    { value: 'teRejectionReason', label: 'Rejection Reason' },
    { value: 'teRejectionRemarks', label: 'Rejection Remarks' },

    // Processing Fee
    { value: 'processingFeeRequired', label: 'Processing Fee Required' },
    { value: 'processingFeeModes', label: 'Processing Fee Mode' },
    { value: 'processingFeeAmount', label: 'Processing Fee Amount' },

    // Tender Fee
    { value: 'tenderFeeRequired', label: 'Tender Fee Required' },
    { value: 'tenderFeeModes', label: 'Tender Fee Mode' },
    { value: 'tenderFeeAmount', label: 'Tender Fee Amount' },

    // EMD
    { value: 'emdRequired', label: 'EMD Required' },
    { value: 'emdModes', label: 'EMD Mode' },
    { value: 'emdAmount', label: 'EMD Amount' },

    // Tender Value & Bid
    { value: 'tenderValueGstInclusive', label: 'Tender Value (GST Inclusive)' },
    { value: 'bidValidityDays', label: 'Bid Validity' },
    { value: 'mafRequired', label: 'MAF Required' },
    { value: 'commercialEvaluation', label: 'Commercial Evaluation' },
    { value: 'reverseAuctionApplicable', label: 'Reverse Auction' },

    // Payment Terms
    { value: 'paymentTermsSupply', label: 'Payment Terms Supply' },
    { value: 'paymentTermsInstallation', label: 'Payment Terms Installation' },

    // Delivery Time
    { value: 'deliveryTimeSupply', label: 'Delivery Time Supply' },
    { value: 'deliveryTimeInstallation', label: 'Delivery Time Installation' },
    { value: 'deliveryTimeInstallationInclusive', label: 'Installation Inclusive' },

    // PBG
    { value: 'pbgRequired', label: 'PBG Required' },
    { value: 'pbgForm', label: 'PBG Form' },
    { value: 'pbgPercentage', label: 'PBG Percentage' },
    { value: 'pbgDurationMonths', label: 'PBG Duration' },

    // SD
    { value: 'sdRequired', label: 'SD Required' },
    { value: 'sdForm', label: 'SD Form' },
    { value: 'securityDepositPercentage', label: 'SD Percentage' },
    { value: 'sdDurationMonths', label: 'SD Duration' },

    // LD
    { value: 'ldRequired', label: 'LD Required' },
    { value: 'ldPercentagePerWeek', label: 'LD Per Week' },
    { value: 'maxLdPercentage', label: 'Max LD Percentage' },

    // Physical Docs
    { value: 'physicalDocsRequired', label: 'Physical Docs Required' },
    { value: 'physicalDocsDeadline', label: 'Physical Docs Deadline' },

    // Technical Eligibility
    { value: 'techEligibilityAgeYears', label: 'Eligibility Age (Years)' },
    { value: 'workValueType', label: 'Work Value Type' },
    { value: 'orderValue1', label: '1 Work Value' },
    { value: 'orderValue2', label: '2 Works Value' },
    { value: 'orderValue3', label: '3 Works Value' },
    { value: 'customEligibilityCriteria', label: 'Custom Eligibility Criteria' },

    // Documents
    { value: 'technicalWorkOrders', label: 'Technical Work Orders' },
    { value: 'commercialDocuments', label: 'Commercial Documents' },

    // Financial Requirements
    { value: 'avgAnnualTurnoverCriteria', label: 'Avg Annual Turnover' },
    { value: 'avgAnnualTurnoverValue', label: 'Avg Turnover Value' },
    { value: 'workingCapitalCriteria', label: 'Working Capital' },
    { value: 'workingCapitalValue', label: 'Working Capital Value' },
    { value: 'solvencyCertificateCriteria', label: 'Solvency Certificate' },
    { value: 'solvencyCertificateValue', label: 'Solvency Value' },
    { value: 'netWorthCriteria', label: 'Net Worth' },
    { value: 'netWorthValue', label: 'Net Worth Value' },

    // Client
    { value: 'clientOrganization', label: 'Client Organization' },
    { value: 'clients', label: 'Client Details' },

    // Address & Remarks
    { value: 'courierAddress', label: 'Courier Address' },
    { value: 'teRemark', label: 'TE Final Remark' },
];
