export interface MakerRequestRow {
    id: number;
    requestNo: string;
    partyName: string;
    accountNumber: string;
    bankName?: string;
    ifsc: string;
    amount: number;
    categoryId?: number;
    categoryName?: string;
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
    partyName: string;
    accountNumber: string;
    bankName?: string;
    ifsc: string;
    amount: number;
    categoryId?: number;
    billFiles?: string[];
    remark?: string;
}
