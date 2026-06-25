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
