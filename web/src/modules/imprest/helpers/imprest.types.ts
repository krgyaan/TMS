export interface ImprestProof {
    url: string;
    type: "image" | "file" | "pdf" | "doc" | string;
    name: string;
}

export interface ImprestRow {
    id: number;
    createdAt: string;
    updatedAt?: string;
    approvedDate?: string | null;
    userId: number;
    categoryId: number | null;
    categoryName: string | null;
    teamId: number | null;
    partyName: string | null;
    projectName: string | null;
    remark: string | null;
    ip?: string | null;
    dateOfExpense?: string | null;
    amount: number;
    strtotime?: number | null;
    approvalStatus: number;
    tallyStatus: number;
    proofStatus: number;
    status: number;
    accRemark: string | null;
    invoiceProof: ImprestProof[];
}

export type ImprestVoucherRow = {
    id: number;
    voucherCode: string;
    beneficiaryName: string;
    beneficiaryId: string;
    amount: number;
    validFrom: string;
    validTo: string;
    year: number;
    week: number;
    adminApproval: boolean;
    accountantApproval: boolean;
    accountsRemark?: string | null;
    adminRemark?: string | null;
    proofs: InvoiceProof[];
    createdAt: string;
};

export type InvoiceProof = {
    id: number;
    file: string;
    ext: string;
    type: "image" | "pdf" | "doc" | string;
    url: string;
};

export type ImprestVoucherView = {
    voucher: {
        id: number;
        voucherCode: string;
        beneficiaryName: string;
        beneficiaryId: number;
        employeeName: string;
        teamName: string;
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
        proofs: InvoiceProof[];
    };
    items: {
        id: number;
        categoryId: number;
        category: string;
        projectCode: string;
        projectName: string;
        remark: string;
        amount: number;
        invoiceProof: string;
    }[];
};

export interface EmployeeImprestDashboardSummaryDto {
    amountSpent: number;
    amountApproved: number;
    amountReceived: number;
    amountLeft: number;

    voucherInfo: {
        totalVouchers: number;
        accountsApproved: number;
        adminApproved: number;
    };
}

export interface EmployeeImprestDashboard {
    summary: {
        amountSpent: number;
        amountApproved: number;
        amountReceived: number;
        amountLeft: number;

        voucherInfo: {
            totalVouchers: number;
            accountsApproved: number;
            adminApproved: number;
        };
    };

    imprests: ImprestRow[];
    transactions: {
        id: number;
        userId: number;
        txnDate: string;
        teamMemberName: string | null;
        projectName: string | null;
        amount: number;
        createdAt: string;
        updatedAt: string;
    }[];
}

export interface ImprestPaymentHistoryRow {
    id: number;
    userId: number;
    teamMemberName: string;
    date: string; // ISO date
    amount: number;
    projectName: string | null;
}

export type ProofItem = {
    type: "image" | "pdf";
    url: string;
    name: string;
};
