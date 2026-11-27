import type { PaginatedResult } from "@/types/api.types";
import type { InsurancePolicyRow } from "@/modules/insurance/helpers/insurance.types";

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
    teamName: string | null;
    partyName: string | null;
    projectName: string | null;
    projectId: number | null,
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
    insurancePolicyId: number | null;
    insurancePolicy?: InsurancePolicyRow | null;
}

export type UpdateImprestPayload = Partial<ImprestRow> & { insurance?: string | null };

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
    createdAt: string;
};

export interface ImprestVoucherListResponse extends PaginatedResult<ImprestVoucherRow> {
    fyOptions: number[];
}

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
    };
    items: {
        id: number;
        categoryId: number;
        category: string;
        projectCode: string;
        projectName: string;
        remark: string;
        amount: number;
        dateOfExpense: string | null;
    }[];
};

export type VoucherLedgerContext = "default" | "project" | "business_development";

export interface VoucherLedgerInfo {
    id: number;
    name: string;
    parent: string | null;
    isActive: boolean;
}

export interface VoucherLedgerReviewItem {
    id: number;
    categoryId: number | null;
    category: string | null;
    projectId: number | null;
    projectName: string | null;
    projectCode: string | null;
    projectTeam: string | null;
    remark: string | null;
    amount: number;
    dateOfExpense: string | null;
    context: VoucherLedgerContext;
    autoLedger: VoucherLedgerInfo | null;
    overrideLedger: VoucherLedgerInfo | null;
    finalLedger: VoucherLedgerInfo | null;
    candidates: VoucherLedgerInfo[];
    ledgerSource: "auto" | "manual";
    tallyLedgerId: number | null;
    blocked: boolean;
    problem: "BLOCKED" | "UNMAPPED" | "INACTIVE" | null;
    reviewedBy: number | null;
    reviewedAt: string | null;
    ledgerNote: string | null;
}

export interface VoucherLedgerReview {
    voucher: {
        id: number;
        voucherCode: string;
        beneficiaryId: number;
        employeeName: string | null;
        teamName: string | null;
        amount: number;
        validFrom: string;
        validTo: string;
        accountsSignedBy: string | null;
        accountsSignedAt: string | null;
        adminSignedBy: string | null;
        adminSignedAt: string | null;
    };
    items: VoucherLedgerReviewItem[];
    editable: boolean;
    lockReason: string | null;
    summary: {
        total: number;
        auto: number;
        manual: number;
        blocked: number;
        unmapped: number;
        inactive: number;
    };
}

export interface VoucherLedgerSaveEntry {
    imprestId: number;
    ledgerId: number | null;
    note?: string | null;
}

export interface LedgerOption {
    id: number;
    name: string;
    parent: string | null;
}

export interface EmployeeImprestDashboardSummaryDto {
    userName: string;
    amountSpent: number;
    amountApproved: number;
    amountReceived: number;
    amountLeft: number;
}

export interface EmployeeImprestDashboard {
    summary: EmployeeImprestDashboardSummaryDto;

    imprests: PaginatedResult<ImprestRow>;
}

export interface EmployeeImprestTransactionRow {
    id: number;
    userId: number;
    txnDate: string;
    teamMemberName: string | null;
    projectName: string | null;
    amount: number;
    createdAt: string;
    updatedAt: string;
    categoryName: string | null;
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
