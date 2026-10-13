export interface PurchaseInvoiceRow {
    id: number;
    projectId: number;
    invoiceNo: string;
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    uploadedBy: string;
    invoiceFile?: string;
    purchaseOrderId?: number;
    poNumber?: string;
    vendorWorkOrderId?: number;
    woNumber?: string;
    total: number;
    createdAt: string;
}

export interface InvoiceItemPayload {
    description: string;
    hsnSac?: string;
    qty: number;
    unit?: string;
    rate: number;
    gstRate: number;
}

export interface ExtraChargePayload {
    label: string;
    amount: number;
    gstRate: number;
}

export interface CreatePurchaseInvoiceDTO {
    projectId: number;
    projectName?: string;
    invoiceNo: string;
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    invoiceFile?: string;
    purchaseOrderId: number;
    vendorWorkOrderId?: number;
    items?: InvoiceItemPayload[];
    extraCharges?: ExtraChargePayload[];
}

export interface UpdatePurchaseInvoiceDTO {
    invoiceNo: string;
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    invoiceFile?: string;
}
