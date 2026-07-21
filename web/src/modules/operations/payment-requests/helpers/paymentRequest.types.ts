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
    vendorWorkOrderId?: number;
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
    vwoNumber?: string;
    createdAt: string;
    piCategory?: string;
    piPartyName?: string;
    piValuePreGst?: string | null;
    piGstAmount?: string | null;
    piInvoiceDate?: string;
    piInvoiceFile?: string | null;
    poTotalAmount?: number | string;
    poTotalGstAmt?: number | string;
    poGrandTotal?: number | string;
    poTdsPercentage?: number | string;
    poTdsAmount?: number | string;
    poAmountAfterTds?: number | string;
    poTotalPaymentRequested?: number | string;
    poTotalMakerDone?: number | string;
    poTotalPaymentDone?: number | string;
    vwoTotalAmount?: number | string;
    vwoTotalGstAmt?: number | string;
    vwoGrandTotal?: number | string;
    vwoTotalPaymentRequested?: number | string;
    vwoTotalMakerDone?: number | string;
    vwoTotalPaymentDone?: number | string;
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
    vendorWorkOrderId?: number;
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
    vendorWorkOrderId?: number;
    uploadedInvoiceFile?: string;
    poFile?: string;
    remark?: string;
}
