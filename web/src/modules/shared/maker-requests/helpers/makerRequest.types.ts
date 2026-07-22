export interface MakerRequestRow {
    id: number;
    requestNo: string;
    partyName?: string;
    accountNumber?: string;
    ifsc?: string;
    amount: number;
    category?: string;
    paymentMode: string;
    portalLink?: string;
    billFiles: string[];
    remark?: string;
    status: string;
    utrNumber?: string;
    rejectionReason?: string;
    requestedBy: string;
    requestedByName?: string;
    createdAt: string;
}

export interface CreateMakerRequestDTO {
    paymentMode: 'BANK_TRANSFER' | 'PORTAL';
    amount: number;
    category?: string;
    partyName?: string;
    accountNumber?: string;
    ifsc?: string;
    portalLink?: string;
    billFiles?: string[];
    remark?: string;
}