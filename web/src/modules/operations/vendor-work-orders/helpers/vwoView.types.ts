export interface VendorWorkOrderView {
    id: number;
    projectId: number;
    tenderId: number;
    woNumber: string;
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
    woDate: string;
    woRaisedBy: number;
    raisedByName?: string;
    products: VwoProduct[];
    total: VwoTotal;
    paymentRequests: VwoPaymentRequest[];
    remarks?: string;
    scopeOfWork?: string;
    termsAndConditions?: any[];
    createdAt: string;
    tdsPercentage?: number | string;
    tdsAmount?: number | string;
    amountAfterTds?: number | string;
    woApproved?: boolean;
    woApprovalRemark?: string;
    category?: string;
    accessoriesPackagingListAttachments?: string;
    purchaseInvoices: VwoPurchaseInvoice[];
    generatedPdfVersions: Record<string, { path: string; hash: string }> | null;
}

export interface VwoProduct {
    id: number;
    vendorWorkOrderId: number;
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

export interface VwoPaymentRequest {
    id: number;
    requestNo: string;
    partyName: string;
    amount: string;
    status: string;
    requestedByName: string;
    createdAt: string;
}

export interface VwoPurchaseInvoice {
    id: number;
    invoiceNo: string;
    valuePreGst: string;
    gstAmount: string;
    invoiceDate: string;
    invoiceFile: string;
    uploadedByName: string;
}

export interface VwoTotal {
    total: number;
    totalGst: number;
    totalWithGst: number;
}
