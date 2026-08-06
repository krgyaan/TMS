export type OrderType = "po" | "vwo";

export interface OrderAttachmentGroup {
    title: string;
    paths: string[];
}

export interface OrderProductRow {
    id: number;
    description: string;
    qty: number | string;
    rate: number | string;
    taxableAmount: number | string;
    gstRate: number | string;
    gstAmount: number | string;
    totalAmount: number | string;
}

export interface OrderPaymentRequestRow {
    id: number;
    requestNo: string;
    partyName: string;
    amount: string;
    status: string;
    requestedByName: string;
    createdAt: string;
}

export interface OrderPurchaseInvoiceRow {
    id: number;
    invoiceNo: string;
    valuePreGst: string;
    gstAmount: string;
    invoiceDate: string;
    invoiceFile: string;
    uploadedByName: string;
}

export interface OrderViewData {
    id: number;
    number: string;
    category?: string;
    date: string;
    raisedByName?: string;
    sellerName: string;
    sellerEmail?: string;
    sellerAddress?: string;
    sellerGstNo?: string;
    sellerPanNo?: string;
    sellerMsmeNo?: string;
    sellerCinNo?: string;
    contactPersonName?: string;
    contactPersonPhone?: string;
    contactPersonEmail?: string;
    shipToName: string;
    shippingAddress: string;
    shipToGst?: string;
    shipToPan?: string;
    products: OrderProductRow[];
    paymentRequests: OrderPaymentRequestRow[];
    purchaseInvoices: OrderPurchaseInvoiceRow[];
    total: { total: number; totalGst: number; totalWithGst: number };
    tdsPercentage?: number | string;
    tdsAmount?: number | string;
    amountAfterTds?: number | string;
    approved?: boolean;
    approvalRemark?: string;
    attachments: OrderAttachmentGroup[];
    generatedPdfVersions: Record<string, { path: string; hash: string }> | null;
}

export function parseAttachments(value?: string | string[] | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [];
    }
}
