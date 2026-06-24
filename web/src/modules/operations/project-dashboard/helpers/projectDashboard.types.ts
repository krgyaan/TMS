// ===================== TERMS ROW =====================
export interface TermRow {
    field: string;
    value: string;
}

// ===================== DTO TYPES =====================
export interface CreatePurchaseOrderDTO {
    tenderId: number;
    projectId?: number;
    projectName?: string;
    poDate: string;
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
    products: CreateProductDTO[];
    quotationNo?: string;
    quotationDate?: string;
    termsAndConditions?: TermRow[];
    remarks?: string;
    technicalSpecsAttachments?: string;
    accessoriesPackagingListAttachments?: string;
}

export interface CreateProductDTO {
    description: string;
    hsnSac: string;
    qty: number;
    rate: number;
    gstRate: number;
    taxableAmount?: number;
    gstAmount?: number;
    totalAmount?: number;
}

export interface CreatePartyDTO {
    name: string;
    alias?: string;
    email?: string;
    address?: string;
    gstNo?: string;
    pan?: string;
    msme?: string;
    type?: string;
}

export interface PurchaseOrderRow {
    id: number;
    projectId: number;
    poNumber: string;
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
    poDate: string;
    poRaisedBy: string;
    createdAt: string;
    totalAmount: number;
    totalGstAmt: number;
    grandTotal: number;
    poPdfVersions?: Record<string, { path: string; hash: string }>;
}

export interface UpdatePurchaseOrderDTO {
    poDate: string;
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
    products: CreateProductDTO[];
    quotationNo?: string;
    quotationDate?: string;
    termsAndConditions?: TermRow[];
    remarks?: string;
    technicalSpecsAttachments?: string;
    accessoriesPackagingListAttachments?: string;
}
