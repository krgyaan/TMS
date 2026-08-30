export const INSURANCE_TYPES = ["WC", "Storage", "Open Marine", "Transit", "CAR", "EAR"] as const;
export type InsuranceType = (typeof INSURANCE_TYPES)[number];
export type InsuranceStatus = "Active" | "Expiring Soon" | "Expired";

export interface InsurancePolicyRow {
    id: number;
    insuranceType: string;
    policyNumber: string | null;
    insurerName: string | null;
    startDate: string | null;
    endDate: string | null;
    sumAssured: string;
    policyDocument: string[];
    lrCopy: string[] | null;
    noOfManpower: number | null;
    manpowerNames: string | null;
    location: string | null;
    itemsCovered: string | null;
    imprestId: number | null;
    makerRequestId: number | null;
    projectId: number | null;
    paymentRequestId: number | null;
    projectName: string | null;
    linkedRequest: string | null;
    createdBy: number | null;
    createdByName: string | null;
    createdAt: string;
    updatedAt?: string;
    status: InsuranceStatus;
    daysRemaining: number;
}

export interface InsuranceFormFields {
    insuranceType?: string | null;
    policyNumber?: string | null;
    insurerName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    policyDocument: string[];
    sumAssured?: number | null;
    noOfManpower?: number | null;
    manpowerNames?: string | null;
    location?: string | null;
    itemsCovered?: string | null;
    lrCopy: string[];
}

export interface InsurancePayload {
    insuranceType: string;
    policyNumber?: string | null;
    insurerName?: string | null;
    startDate: string;
    endDate: string;
    policyDocument: string[];
    sumAssured: number;
    noOfManpower?: number | null;
    manpowerNames?: string | null;
    location?: string | null;
    itemsCovered?: string | null;
    lrCopy?: string[] | null;
    insurancePolicyId?: number | null;
}

export interface InsuranceCreatePayload extends InsurancePayload {
    imprestId?: number | null;
    makerRequestId?: number | null;
    projectId?: number | null;
}

export interface InsuranceListResponse {
    data: InsurancePolicyRow[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface LinkedImprestDetails {
    imprestId: number;
    userId: number | null;
    userName: string | null;
    categoryName: string | null;
    projectName: string | null;
    amount: number | null;
    dateOfExpense: string | null;
    approvalStatus: number | null;
    linkType: string;
}

export interface LinkedMakerRequestDetails {
    makerRequestId: number;
    requestNo: string | null;
    partyName: string | null;
    amount: string | null;
    paymentMode: string | null;
    status: string | null;
    requestedBy: number | null;
    requestedByName: string | null;
    createdAt: string | null;
    projectId: number | null;
    projectName: string | null;
    utrNumber: string | null;
    rejectionReason: string | null;
    linkType: string;
}

export interface InsurancePolicyDetail extends InsurancePolicyRow {
    linkedImprests: LinkedImprestDetails[];
    linkedMakerRequests: LinkedMakerRequestDetails[];
    linkedPaymentRequests: LinkedPaymentRequestDetails[];
}

export interface LinkedPaymentRequestDetails {
    paymentRequestId: number;
    requestNo: string | null;
    partyName: string | null;
    amount: string | null;
    paymentMode: string | null;
    status: string | null;
    requestedBy: number | null;
    requestedByName: string | null;
    createdAt: string | null;
    projectId: number | null;
    projectName: string | null;
    utrNumber: string | null;
    rejectionReason: string | null;
    linkType: string;
}