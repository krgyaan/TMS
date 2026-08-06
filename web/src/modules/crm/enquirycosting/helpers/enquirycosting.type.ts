export interface EnquiryCosting {
    id: number;
    enquiryId: number;
    enquiryNumber: string | null;
    enqName: string;
    createdByName: string | null;
    organizationName: string | null;
    orgAbbName: string | null;
    approxValue: string;
    finalPrice: string | null;
    receiptPreGst: string | null;
    budgetPreGst: string | null;
    grossMargin: string | null;
    approvedFinalPrice: string | null;
    approvedReceiptPreGst: string | null;
    approvedBudgetPreGst: string | null;
    approvedGrossMargin: string | null;
    preparedByName: string | null;
    approvedByName: string | null;
    status: string | null;
    sheetUrl: string | null;
    remarks: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface SubmitCostingSheetRequest {
    enquiryId: number;
    finalPrice?: string | null;
    receiptPreGst?: string | null;
    budgetPreGst?: string | null;
    grossMargin?: string | null;
    remarks?: string | null;
}

export interface SubmitCostingSheetResponse {
    success: boolean;
}

export interface ResubmitCostingSheetRequest {
    enquiryId: number;
    finalPrice?: string | null;
    receiptPreGst?: string | null;
    budgetPreGst?: string | null;
    grossMargin?: string | null;
    remarks?: string | null;
}

export interface ApproveCostingSheetRequest {
    finalPrice?: string | null;
    receiptPreGst?: string | null;
    budgetPreGst?: string | null;
    grossMargin?: string | null;
    oemVendorId?: number | null;
    approvalRemarks?: string | null;
}

export interface RedoCostingSheetRequest {
    reason: string;
}

export interface RejectEnquiryRequest {
    reason?: string | null;
}

export interface EnquiryCostingListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
