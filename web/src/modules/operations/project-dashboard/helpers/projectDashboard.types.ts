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
    sellerCinNo?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
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
    warrantyDispatch?: string;
    warrantyInstallation?: string;
    freight?: string;
    transitInsurance?: string;
    materialUnloading?: string;
    technicalSpecifications?: string;
    documentation?: string;
    poRaisedBy?: number;
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
    sellerCinNo?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
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
    warrantyDispatch?: string;
    warrantyInstallation?: string;
    freight?: string;
    transitInsurance?: string;
    materialUnloading?: string;
    technicalSpecifications?: string;
    documentation?: string;
    poRaisedBy?: number;
}
