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

export interface CreatePurchaseInvoiceDTO {
    projectId: number;
    projectName?: string;
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    invoiceFile?: string;
    purchaseOrderId?: number;
    vendorWorkOrderId?: number;
}

export interface UpdatePurchaseInvoiceDTO {
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    invoiceFile?: string;
    purchaseOrderId?: number;
    vendorWorkOrderId?: number;
}
