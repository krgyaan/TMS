export interface CreateSaleInvoiceDTO {
    projectId: number;
    woDetailId?: number;
    invoiceDate: string;
    billingCustomerName: string;
    billingAddress: string;
    billingGst?: string;
    billingEmail?: string;
    billingPanNo?: string;
    billingMsmeNo?: string;
    billingCinNo?: string;
    shippingCustomerName: string;
    shippingAddress: string;
    shippingGst?: string;
    shippingPanNo?: string;
    dispatchFromName?: string;
    dispatchFromAddress?: string;
    dispatchFromGst?: string;
    dispatchVehicleNo?: string;
    dispatchLrNo?: string;
    dispatchToName?: string;
    dispatchToAddress?: string;
    dispatchToGst?: string;
    items: SaleInvoiceItemDTO[];
    remarks?: string;
}

export interface SaleInvoiceItemDTO {
    srNo?: number;
    itemDescription: string;
    qty: number;
    rate: number;
    gstRate: number;
    purchaseOrderProductId?: number;
    unit?: string;
    hsnSac?: string;
}

export interface ProjectInventoryItem {
    id: number;
    poId: number;
    poNumber: string;
    description: string;
    hsnSac: string | null;
    unit: string;
    qty: number;
    rate: number;
    gstRate: number;
    invoicedQty: number;
    remainingQty: number;
}

export type SaleInvoiceStatus =
    | "oe_request"
    | "draft"
    | "changes_requested"
    | "approved"
    | "invoiced"
    | "credit_note"
    | "payment_received"
    | "completed";

export interface SaleInvoiceRow {
    id: number;
    projectId: number;
    invoiceNumber: string;
    invoiceDate: string;
    billingCustomerName: string;
    billingAddress: string;
    billingGst?: string;
    billingEmail?: string;
    billingPanNo?: string;
    billingMsmeNo?: string;
    billingCinNo?: string;
    shippingCustomerName: string;
    shippingAddress: string;
    shippingGst?: string;
    shippingPanNo?: string;
    totalPreGst: number;
    totalGst: number;
    grandTotal: number;
    status: string;
    raisedBy: string;
    createdAt: string;
    remarks?: string;
    invoiceDocPaths?: string[];
    dispatchFromName?: string;
    dispatchFromAddress?: string;
    dispatchFromGst?: string;
    dispatchVehicleNo?: string;
    dispatchLrNo?: string;
    dispatchToName?: string;
    dispatchToAddress?: string;
    dispatchToGst?: string;
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
