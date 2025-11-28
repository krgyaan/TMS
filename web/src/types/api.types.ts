// Tender Info Sheet Types
export interface TenderClient {
    id?: number;
    clientName: string;
    clientDesignation?: string | null;
    clientMobile?: string | null;
    clientEmail?: string | null;
}

export interface TenderInfoSheet {
    id?: number;
    tenderId: number;

    // TE Recommendation
    teRecommendation: 'YES' | 'NO';
    teRejectionReason?: number | null;
    teRejectionRemarks?: string | null;

    // Processing Fee
    processingFeeRequired?: 'YES' | 'NO' | null;
    processingFeeAmount?: number | string | null;
    processingFeeModes?: string[] | null;

    // Tender Fee
    tenderFeeRequired?: 'YES' | 'NO' | null;
    tenderFeeAmount?: number | string | null;
    tenderFeeModes?: string[] | null;

    // EMD
    emdRequired?: 'YES' | 'NO' | 'EXEMPT' | null;
    emdAmount?: number | string | null;
    emdModes?: string[] | null;

    // Auction & Terms
    reverseAuctionApplicable?: 'YES' | 'NO' | null;
    paymentTermsSupply?: number | null;
    paymentTermsInstallation?: number | null;
    bidValidityDays?: number | null;
    commercialEvaluation?: 'ITEM_WISE_GST_INCLUSIVE' | 'ITEM_WISE_PRE_GST' | 'OVERALL_GST_INCLUSIVE' | 'OVERALL_PRE_GST' | null;
    mafRequired?: 'YES_GENERAL' | 'YES_PROJECT_SPECIFIC' | 'NO' | null;

    // Delivery Time
    deliveryTimeSupply?: number | null;
    deliveryTimeInstallationInclusive?: boolean;
    deliveryTimeInstallationDays?: number | null;
    // Frontend alias for deliveryTimeInstallationDays
    deliveryTimeInstallation?: number | null;

    // PBG
    pbgRequired?: 'YES' | 'NO' | null;
    pbgMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    // Frontend alias for pbgMode
    pbgForm?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgPercentage?: number | string | null;
    pbgDurationMonths?: number | null;

    // Security Deposit
    sdRequired?: 'YES' | 'NO' | null;
    sdMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    // Frontend alias for sdMode
    sdForm?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    sdPercentage?: number | string | null;
    // Frontend alias for sdPercentage
    securityDepositPercentage?: number | string | null;
    sdDurationMonths?: number | null;

    // LD
    ldRequired?: 'YES' | 'NO' | null;
    ldPercentagePerWeek?: number | string | null;
    maxLdPercentage?: number | string | null;

    // Physical Docs
    physicalDocsRequired?: 'YES' | 'NO' | null;
    physicalDocsDeadline?: string | Date | null;

    // Technical Eligibility
    techEligibilityAge?: number | null;
    // Frontend alias for techEligibilityAge
    techEligibilityAgeYears?: number | null;
    workOrderValue1Required?: 'YES' | 'NO' | null;
    orderValue1?: number | string | null;
    wo1Custom?: string | null;
    workOrderValue2Required?: 'YES' | 'NO' | null;
    orderValue2?: number | string | null;
    wo2Custom?: string | null;
    workOrderValue3Required?: 'YES' | 'NO' | null;
    orderValue3?: number | string | null;
    wo3Custom?: string | null;

    // Financial Requirements
    avgAnnualTurnoverType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    // Frontend alias for avgAnnualTurnoverType
    avgAnnualTurnoverCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverValue?: number | string | null;
    workingCapitalType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    // Frontend alias for workingCapitalType
    workingCapitalCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalValue?: number | string | null;
    solvencyCertificateType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    // Frontend alias for solvencyCertificateType
    solvencyCertificateCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateValue?: number | string | null;
    netWorthType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    // Frontend alias for netWorthType
    netWorthCriteria?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthValue?: number | string | null;

    // Documents
    technicalWorkOrders?: string[] | null;
    commercialDocuments?: string[] | null;

    // Client & Address
    clientOrganization?: string | null;
    clients?: TenderClient[];
    courierAddress?: string | null;

    // Final Remark
    teFinalRemark?: string | null;
    // Frontend alias for teFinalRemark
    teRemark?: string | null;
    // Frontend alias for teRejectionRemarks
    rejectionRemark?: string | null;
}

export interface SaveTenderInfoSheetDto {
    // TE Recommendation
    teRecommendation: 'YES' | 'NO';
    teRejectionReason?: number | null;
    teRejectionRemarks?: string | null;

    // Processing Fee
    processingFeeRequired?: 'YES' | 'NO' | null;
    processingFeeAmount?: number | null;
    processingFeeModes?: string[] | null;

    // Tender Fee
    tenderFeeRequired?: 'YES' | 'NO' | null;
    tenderFeeAmount?: number | null;
    tenderFeeModes?: string[] | null;

    // EMD
    emdRequired?: 'YES' | 'NO' | 'EXEMPT' | null;
    emdAmount?: number | null;
    emdModes?: string[] | null;

    // Auction & Terms
    reverseAuctionApplicable?: 'YES' | 'NO' | null;
    paymentTermsSupply?: number | null;
    paymentTermsInstallation?: number | null;
    bidValidityDays?: number | null;
    commercialEvaluation?: 'ITEM_WISE_GST_INCLUSIVE' | 'ITEM_WISE_PRE_GST' | 'OVERALL_GST_INCLUSIVE' | 'OVERALL_PRE_GST' | null;
    mafRequired?: 'YES_GENERAL' | 'YES_PROJECT_SPECIFIC' | 'NO' | null;

    // Delivery Time
    deliveryTimeSupply?: number | null;
    deliveryTimeInstallationInclusive?: boolean;
    deliveryTimeInstallationDays?: number | null;

    // PBG
    pbgRequired?: 'YES' | 'NO' | null;
    pbgMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    pbgPercentage?: number | null;
    pbgDurationMonths?: number | null;

    // Security Deposit
    sdRequired?: 'YES' | 'NO' | null;
    sdMode?: 'DD_DEDUCTION' | 'FDR' | 'PBG' | 'SB' | 'NA' | null;
    sdPercentage?: number | null;
    sdDurationMonths?: number | null;

    // LD
    ldRequired?: 'YES' | 'NO' | null;
    ldPercentagePerWeek?: number | null;
    maxLdPercentage?: number | null;

    // Physical Docs
    physicalDocsRequired?: 'YES' | 'NO' | null;
    physicalDocsDeadline?: string | Date | null;

    // Technical Eligibility
    techEligibilityAge?: number | null;
    workOrderValue1Required?: 'YES' | 'NO' | null;
    orderValue1?: number | null;
    wo1Custom?: string | null;
    workOrderValue2Required?: 'YES' | 'NO' | null;
    orderValue2?: number | null;
    wo2Custom?: string | null;
    workOrderValue3Required?: 'YES' | 'NO' | null;
    orderValue3?: number | null;
    wo3Custom?: string | null;

    // Financial Requirements
    avgAnnualTurnoverType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    avgAnnualTurnoverValue?: number | null;
    workingCapitalType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    workingCapitalValue?: number | null;
    solvencyCertificateType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    solvencyCertificateValue?: number | null;
    netWorthType?: 'NOT_APPLICABLE' | 'POSITIVE' | 'AMOUNT' | null;
    netWorthValue?: number | null;

    // Documents
    technicalWorkOrders?: string[] | null;
    commercialDocuments?: string[] | null;

    // Client & Address
    clientOrganization?: string | null;
    clients: Array<{
        clientName: string;
        clientDesignation?: string | null;
        clientMobile?: string | null;
        clientEmail?: string | null;
    }>;
    courierAddress?: string | null;

    // Final Remark
    teFinalRemark?: string | null;
}

// Other types that might be needed
export interface TenderInfo {
    id: number;
    tenderNo: string;
    tenderName: string;
    // ... other fields
}

export interface TenderInfoWithNames extends TenderInfo {
    organizationName?: string | null;
    teamMemberName?: string | null;
    teamMemberUsername?: string | null;
    statusName?: string | null;
    itemName?: string | null;
    organizationAcronym?: string | null;
    locationName?: string | null;
    locationState?: string | null;
    websiteName?: string | null;
    websiteLink?: string | null;
}
