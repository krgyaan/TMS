export interface TermRow {
    field: string;
    value: string;
}

export interface VendorWorkOrderRow {
    id: number;
    projectId: number;
    woNumber: string;
    sellerName: string;
    sellerEmail?: string;
    sellerAddress?: string;
    sellerGstNo?: string;
    sellerPanNo?: string;
    sellerMsmeNo?: string;
    sellerCinNo?: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst?: string;
    shipToPan?: string;
    woDate: string;
    woRaisedBy: string;
    createdAt: string;
    totalAmount: number;
    totalGstAmt: number;
    grandTotal: number;
    generatedPdfVersions?: Record<string, { path: string; hash: string }>;
}

export interface CreateVendorWorkOrderDTO {
    tenderId: number;
    projectId?: number;
    projectName?: string;
    woDate: string;
    sellerId?: number;
    shipToPartyId?: number;
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
    certRecipients?: number[];
    shipToName: string;
    shippingAddress: string;
    shipToGst?: string;
    shipToPan?: string;
    products: Array<{
        description: string;
        hsnSac: string;
        qty: number;
        rate: number;
        gstRate: number;
        taxableAmount?: number;
        gstAmount?: number;
        totalAmount?: number;
    }>;
    termsAndConditions?: TermRow[];
    remarks?: string;
    scopeOfWork?: string;
    accessoriesPackagingListAttachments?: string;
}

export interface UpdateVendorWorkOrderDTO {
    woDate: string;
    sellerId?: number;
    shipToPartyId?: number;
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
    certRecipients?: number[];
    shipToName: string;
    shippingAddress: string;
    shipToGst?: string;
    shipToPan?: string;
    products: Array<{
        description: string;
        hsnSac: string;
        qty: number;
        rate: number;
        gstRate: number;
    }>;
    termsAndConditions?: TermRow[];
    remarks?: string;
    scopeOfWork?: string;
    accessoriesPackagingListAttachments?: string;
}
