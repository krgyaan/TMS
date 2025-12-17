// src/modules/imprest/imprest.types.ts

export interface ImprestProof {
    url: string;
    type: "image" | "file" | "pdf" | "doc" | string;
    name: string;
}

export interface ImprestRow {
    id: number;

    // timestamps
    createdAt: string;
    updatedAt?: string;
    approvedDate?: string | null;

    // relations
    userId: number;
    categoryId: number | null;
    teamId: number | null;

    // strings
    partyName: string | null;
    projectName: string | null;
    remark: string | null;
    ip?: string | null;

    // numeric
    amount: number;
    strtotime?: number | null;

    // workflow statuses
    approvalStatus: number;
    tallyStatus: number;
    proofStatus: number;
    status: number;

    // jsonb
    invoiceProof: ImprestProof[];
}

export type ImprestVoucherRow = {
    id: number;
    voucherCode: string;
    beneficiaryName: string;
    amount: number;
    validFrom: string;
    validTo: string;
    approvalStatus: number;
    accountsSignedBy: string | null;
    adminApproval: boolean;
    accountantApproval: boolean;
    adminSignedBy: string | null;
    createdAt: string;
};

export type ImprestVoucherView = {
    voucher: {
        id: number;
        voucherCode: string;
        beneficiaryName: string;
        amount: number;
        validFrom: string;
        validTo: string;
        approvalStatus: number;
        accountsSignedBy: string | null;
        accountsSignedAt: string | null;
        adminSignedBy: string | null;
        adminSignedAt: string | null;
        accountsRemark: string | null;
        adminRemark: string | null;
    };
    items: {
        id: number;
        categoryId: number;
        projectName: string;
        remark: string;
        amount: number;
        invoiceProof: string;
    }[];
};
