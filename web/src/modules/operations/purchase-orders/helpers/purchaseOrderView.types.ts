export interface PurchaseOrderView {
    id: number;
    projectId: number;
    tenderId: number;
    poNumber: string;
    sellerName: string;
    sellerEmail?: string;
    sellerAddress?: string;
    sellerGstNo?: string;
    sellerPanNo?: string;
    sellerMsmeNo?: string;
    sellerCinNo?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst?: string;
    shipToPan?: string;
    poDate: string;
    poRaisedBy: number;
    raisedByName?: string;
    products: PoProduct[];
    total: PoTotal;
    paymentRequests: PoPaymentRequest[];
    purchaseInvoices: PoPurchaseInvoice[];
    remarks?: string;
    quotationNo?: string;
    quotationDate?: string;
    termsAndConditions?: any[];
    createdAt: string;
    tdsPercentage?: number | string;
    tdsAmount?: number | string;
    amountAfterTds?: number | string;
    poApproved?: boolean;
    poApprovalRemark?: string;
    category?: string;
    generatedPdfVersions: Record<string, { path: string; hash: string }> | null;
}

export interface PoProduct {
    id: number;
    purchaseOrderId: number;
    description: string;
    qty: number;
    rate: number;
    taxableAmount: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
    itemTotal: number;
    itemTotalGst: number;
    itemTotalWithGst: number;
}

export interface PoPaymentRequest {
    id: number;
    requestNo: string;
    partyName: string;
    amount: string;
    status: string;
    requestedByName: string;
    createdAt: string;
}

export interface PoPurchaseInvoice {
    id: number;
    invoiceNo: string;
    valuePreGst: string;
    gstAmount: string;
    invoiceDate: string;
    invoiceFile: string;
    uploadedByName: string;
}

export interface PoTotal {
    total: number;
    totalGst: number;
    totalWithGst: number;
}
