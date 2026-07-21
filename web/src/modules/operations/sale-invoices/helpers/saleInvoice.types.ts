export interface CreateSaleInvoiceDTO {
    projectId: number;
    woDetailId?: number;
    invoiceDate: string;
    billingCustomerName: string;
    billingAddress: string;
    billingGst?: string;
    shippingCustomerName: string;
    shippingAddress: string;
    shippingGst?: string;
    items: SaleInvoiceItemDTO[];
    remarks?: string;
}

export interface SaleInvoiceItemDTO {
    srNo?: number;
    itemDescription: string;
    qty: number;
    rate: number;
    gstRate: number;
}

export interface SaleInvoiceRow {
    id: number;
    projectId: number;
    invoiceNumber: string;
    invoiceDate: string;
    billingCustomerName: string;
    billingAddress: string;
    billingGst?: string;
    shippingCustomerName: string;
    shippingAddress: string;
    shippingGst?: string;
    totalPreGst: number;
    totalGst: number;
    grandTotal: number;
    status: string;
    raisedBy: string;
    createdAt: string;
    remarks?: string;
}

export interface SaleInvoiceListRow {
    id: number;
    projectId: number;
    invoiceNumber: string;
    invoiceDate: string;
    billingCustomerName: string;
    totalPreGst: string;
    totalGst: string;
    grandTotal: string;
    status: string;
    invoiceDocPaths?: string[];
    projectName: string;
    raisedByName: string;
    createdAt: string;
}

export interface WoBillingAddress {
    id: number;
    woDetailId: number;
    srNos: number[] | "all";
    customerName: string;
    address: string;
    gst: string | null;
}

export interface WoShippingAddress {
    id: number;
    woDetailId: number;
    srNos: number[] | "all";
    customerName: string;
    address: string;
    gst: string | null;
}

export interface WoBoqItem {
    id: number;
    woDetailId: number;
    srNo: number;
    itemDescription: string;
    quantity: string;
    rate: string;
    amount: string | null;
}

export interface WoBillingData {
    woDetailId: number;
    billingBoq: WoBoqItem[];
    buybackBoq: WoBoqItem[];
    billingAddresses: WoBillingAddress[];
    shippingAddresses: WoShippingAddress[];
}
