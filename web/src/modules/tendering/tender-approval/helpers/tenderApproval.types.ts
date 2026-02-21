import { z } from 'zod';
import { TenderApprovalFormSchema } from './tenderApproval.schema';
import type { TimerStatus } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

// Form Values Type (inferred from Zod schema)
export type TenderApprovalFormValues = z.infer<typeof TenderApprovalFormSchema>;

// Incomplete Field
export interface IncompleteField {
    id?: number;
    fieldName: string;
    comment: string;
    status?: "pending" | "resolved";
}

// Save DTO - what we send to API
export interface SaveTenderApprovalDto {
    tlStatus: "0" | "1" | "2" | "3" | number;
    rfqTo?: number[];
    processingFeeMode?: string;
    tenderFeeMode?: string;
    emdMode?: string;
    approvePqrSelection?: "1" | "2";
    approveFinanceDocSelection?: "1" | "2";
    alternativeTechnicalDocs?: string[];
    alternativeFinancialDocs?: string[];
    tenderStatus?: number;
    oemNotAllowed?: string;
    tlRejectionRemarks?: string;
    incompleteFields?: IncompleteField[];
}

// Response from API
export interface TenderApproval {
    id?: number;
    tenderId?: number;
    tlStatus?: "0" | "1" | "2" | "3" | number;
    tlDecision?: "0" | "1" | "2" | "3" | number;
    rfqTo: number[] | null;
    processingFeeMode: string | null;
    tenderFeeMode: string | null;
    emdMode: string | null;
    approvePqrSelection: "1" | "2" | null;
    approveFinanceDocSelection: "1" | "2" | null;
    alternativeTechnicalDocs?: string[] | null;
    alternativeFinancialDocs?: string[] | null;
    tenderStatus: number | null;
    oemNotAllowed: string | null;
    tlRejectionRemarks: string | null;
    incompleteFields?: IncompleteField[];
    createdAt?: string;
    updatedAt?: string;
}

// Re-export from tenders module
export type { TenderWithRelations } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

export interface TenderApprovalRow {
    tenderId: number;
    tenderNo: string;
    tenderName: string;
    item: number;
    gstValues: number;
    tenderFees: number;
    emd: number;
    teamMember: number;
    dueDate: string;
    status: number;
    teamMemberName: string;
    itemName: string;
    statusName: string;
    tlStatus: number;
}

export type TenderApprovalFilters = {
    tabKey?: "pending" | "accepted" | "rejected" | "tender-dnb";
    tlStatus?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
};

export type TenderApprovalTabData = {
    key: "pending" | "accepted" | "rejected" | "tender-dnb";
    name: string;
    count: number;
    data: TenderApprovalRow[];
};

export interface TenderApprovalDashboardCounts {
    pending: number;
    accepted: number;
    rejected: number;
    "tender-dnb": number;
    total: number;
}

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

export interface TenderApprovalWithTimer extends TenderApprovalRow {
    timer?: {
        remainingSeconds: number;
        status: TimerStatus;
        stepName: string;
    } | null;
}
