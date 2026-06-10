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
}

export interface UpdatePurchaseInvoiceDTO {
    category: string;
    partyName: string;
    valuePreGst: number;
    gstAmount: number;
    invoiceDate: string;
    invoiceFile?: string;
}
