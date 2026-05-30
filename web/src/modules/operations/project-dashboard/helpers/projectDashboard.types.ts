// ===================== DTO TYPES =====================
export interface CreatePurchaseOrderDTO {
    tenderId: number;
    poDate: string;
    sellerId?: number;
    sellerName: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerGstNo: string;
    sellerPanNo: string;
    sellerMsmeNo: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst: string;
    shipToPan: string;
    products: CreateProductDTO[];
    quotationNo?: string;
    quotationDate?: string;
    paymentTerms?: string;
    deliveryPeriod?: string;
    remarks?: string;
}

export interface CreateProductDTO {
    description: string;
    hsnSac: string;
    qty: number;
    rate: number;
    gstRate: number;
}

export interface CreatePartyDTO {
    name: string;
    email?: string;
    address?: string;
    gstNo?: string;
    pan?: string;
    msme?: string;
}

export interface UpdatePurchaseOrderDTO {
    poDate: string;
    sellerId?: number;
    sellerName: string;
    sellerEmail: string;
    sellerAddress: string;
    sellerGstNo: string;
    sellerPanNo: string;
    sellerMsmeNo: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst: string;
    shipToPan: string;
    products: CreateProductDTO[];
    quotationNo?: string;
    quotationDate?: string;
    paymentTerms?: string;
    deliveryPeriod?: string;
    remarks?: string;
}
