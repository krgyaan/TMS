export interface PoPaymentRequest {
    id: number;
    requestNo: string;
    partyName: string;
    amount: number;
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
    invoiceFile: string | null;
    uploadedByName: string;
}

export interface PoProduct {
    id: number;
    purchaseOrderId: number;
    description: string | null;
    hsnSac: string | null;
    qty: string;
    rate: string;
    taxableAmount: string;
    gstRate: string;
    gstAmount: string;
    totalAmount: string;
    createdAt: string;
    updatedAt: string;
    itemTotal: number;
    itemTotalGst: number;
    itemTotalWithGst: number;
}

export interface PoTotal {
    total: number;
    totalGst: number;
    totalWithGst: number;
}

export interface PurchaseOrderView {
    id: number;
    projectId: number;
    poNumber: string;
    poDate: string;
    category: string | null;
    poType: string;
    sellerName: string;
    sellerEmail: string | null;
    sellerAddress: string | null;
    sellerGstNo: string | null;
    sellerPanNo: string | null;
    sellerMsmeNo: string | null;
    sellerCinNo: string | null;
    contactPersonName: string | null;
    contactPersonPhone: string | null;
    contactPersonEmail: string | null;
    shipToName: string;
    shippingAddress: string;
    shipToGst: string | null;
    shipToPan: string | null;
    quotationNo: string | null;
    quotationDate: string | null;
    termsAndConditions: any;
    remarks: string | null;
    technicalSpecsAttachments: string | null;
    accessoriesPackagingListAttachments: string | null;
    tenderId: number;
    tdsPercentage: string | null;
    tdsAmount: string | null;
    amountAfterTds: string | null;
    poApproved: boolean | null;
    poApprovalRemark: string | null;
    generatedPdfVersions: Record<string, { path: string; hash: string }>;
    certRecipients: any;
    raisedByName: string | null;
    total: PoTotal;
    products: PoProduct[];
    paymentRequests: PoPaymentRequest[];
    purchaseInvoices: PoPurchaseInvoice[];
}
