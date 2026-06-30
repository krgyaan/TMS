export interface PaymentRequestRow {
    id: number;
    projectId: number;
    requestNo: string;
    partyName: string;
    accountNumber: string;
    bankName?: string;
    ifsc: string;
    amount: number;
    paymentAgainst: string;
    purchaseInvoiceId?: number;
    purchaseOrderId?: number;
    uploadedInvoiceFile?: string;
    poFile?: string;
    remark?: string;
    status: string;
    requestedBy: string;
    requestedByName?: string;
    utrNumber?: string;
    rejectionReason?: string;
    projectName?: string;
    poNumber?: string;
    createdAt: string;
    piCategory?: string;
    piPartyName?: string;
    piValuePreGst?: string | null;
    piGstAmount?: string | null;
    piInvoiceDate?: string;
    piInvoiceFile?: string | null;
}

export interface CreatePaymentRequestDTO {
    projectId: number;
    projectName?: string;
    partyName: string;
    accountNumber: string;
    bankName?: string;
    ifsc: string;
    amount: number;
    paymentAgainst: string;
    purchaseInvoiceId?: number;
    purchaseOrderId?: number;
    uploadedInvoiceFile?: string;
    poFile?: string;
    remark?: string;
}

export interface UpdatePaymentRequestDTO {
    partyName: string;
    accountNumber: string;
    bankName?: string;
    ifsc: string;
    amount: number;
    paymentAgainst: string;
    purchaseInvoiceId?: number;
    purchaseOrderId?: number;
    uploadedInvoiceFile?: string;
    poFile?: string;
    remark?: string;
}
