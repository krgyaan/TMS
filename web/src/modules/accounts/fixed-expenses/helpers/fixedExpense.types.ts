import type { FixedExpenseFormValues } from './fixedExpense.schema';

// ===================== ENUM TYPES =====================

export type FixedExpenseFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual';

export type FixedExpensePaymentMode = 'auto_debit' | 'bank_transfer';

export type FixedExpenseAmountType = 'fixed' | 'variable';

// ===================== API TYPES =====================

export interface FixedExpenseResponse {
    id: number;
    partyName: string;
    amountType: FixedExpenseAmountType;
    amount: string;
    paymentMode: FixedExpensePaymentMode;
    accountName: string | null;
    accountNumber: string | null;
    ifscCode: string | null;
    type: string;
    categoryId: number | null;
    subCategory: string | null;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    deleteStatus: boolean;
    makerId: number | null;
    status: string | null;
    makerRequestNo?: string | null;
    makerRequestStatus?: string | null;
    cyclesTotal: number;
    cyclesPaid: number;
    cycleRequestNos: string[];
    lastPaymentDoneAt?: string | null;
    createdBy: number;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type FixedExpenseListRow = FixedExpenseResponse;

export interface FixedExpenseHistoryRow {
    id: number;
    cycle: number;
    dueDate: string;
    amount: string;
    amountType: FixedExpenseAmountType;
    paymentFrequency: FixedExpenseFrequency;
    status: string;
    makerId: number | null;
    makerRequestNo: string | null;
    makerRequestStatus: string | null;
    makerRequestAmount: string | null;
    utrNumber: string | null;
    updatedAt: string;
    approvedBy: number | null;
    approvedByName: string | null;
    updatedBy: number | null;
    updatedByName: string | null;
    createdAt: string;
}

export interface FixedExpenseListParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    paymentFrequency?: FixedExpenseFrequency;
    paymentMode?: FixedExpensePaymentMode;
    amountType?: FixedExpenseAmountType;
    status?: 'Pending' | 'Done';
    deleteStatus?: boolean;
    sortBy?: 'partyName' | 'amount' | 'type' | 'dueDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface CreateFixedExpenseDto {
    partyName: string;
    amountType: FixedExpenseAmountType;
    amount: string;
    paymentMode: FixedExpensePaymentMode;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    categoryId: number;
    type?: string;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    makerId?: number | null;
}

export type UpdateFixedExpenseDto = Partial<CreateFixedExpenseDto>;

export type { FixedExpenseFormValues };

// ===================== OPTION CONSTANTS =====================

export type FixedExpenseSelectOption = { value: string; label: string };

export const FIXED_EXPENSE_FREQUENCY_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half_yearly', label: 'Half Yearly' },
    { value: 'annual', label: 'Annual' },
];

export const FIXED_EXPENSE_PAYMENT_MODE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'auto_debit', label: 'Auto Debit' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
];

export const FIXED_EXPENSE_AMOUNT_TYPE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'fixed', label: 'Fixed' },
    { value: 'variable', label: 'Variable' },
];

export const FIXED_EXPENSE_STATUS_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'Awaited Maker', label: 'Awaited Maker' },
    { value: 'Maker Created', label: 'Maker Created' },
    { value: 'Maker Done', label: 'Maker Done' },
    { value: 'Payment Done', label: 'Payment Done' },
    { value: 'Maker Rejected', label: 'Maker Rejected' },
];

// ===================== LABEL MAPS =====================

export const FIXED_EXPENSE_TYPE_LABELS: Record<string, string> = {
    electricity: 'Electricity',
    rent: 'Rent',
    salary: 'Salary',
    communication: 'Communication',
    software: 'Software',
    admin: 'Admin',
};

export const FIXED_EXPENSE_FREQUENCY_LABELS: Record<FixedExpenseFrequency, string> = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    half_yearly: 'Half Yearly',
    annual: 'Annual',
};

export const FIXED_EXPENSE_PAYMENT_MODE_LABELS: Record<FixedExpensePaymentMode, string> = {
    auto_debit: 'Auto Debit',
    bank_transfer: 'Bank Transfer',
};

export const FIXED_EXPENSE_AMOUNT_TYPE_LABELS: Record<FixedExpenseAmountType, string> = {
    fixed: 'Fixed',
    variable: 'Variable',
};

export const FIXED_EXPENSE_STATUS_LABELS: Record<string, string> = {
    'Awaited Maker': 'Awaited Maker',
    'Maker Created': 'Maker Created',
    'Maker Done': 'Maker Done',
    'Payment Done': 'Payment Done',
    'Maker Rejected': 'Maker Rejected',
};

export const FIXED_EXPENSE_STATUS_STYLES: Record<string, string> = {
    'Awaited Maker': 'bg-slate-100 text-slate-700 border-transparent',
    'Maker Created': 'bg-blue-100 text-blue-800 border-transparent',
    'Maker Done': 'bg-indigo-100 text-indigo-800 border-transparent',
    'Payment Done': 'bg-emerald-100 text-emerald-800 border-transparent',
    'Maker Rejected': 'bg-red-100 text-red-800 border-transparent',
};

// The status comes from the expense's workflow row (fixed_expenses_history),
// which is "Awaited Maker" until the cron creates a maker request.
export const getFixedExpenseDisplayStatus = (row: {
    status?: string | null;
}): { label: string; className: string } => {
    const status = row.status;
    if (!status) return { label: '—', className: '' };

    return {
        label: FIXED_EXPENSE_STATUS_LABELS[status] ?? status,
        className: FIXED_EXPENSE_STATUS_STYLES[status] ?? '',
    };
};
