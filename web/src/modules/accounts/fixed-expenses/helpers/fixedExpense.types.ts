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
    makerRequestNo?: string | null;
    makerRequestStatus?: string | null;
    createdBy: number;
    createdByName?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type FixedExpenseListRow = FixedExpenseResponse;

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
    { value: 'pending', label: 'Pending' },
    { value: 'maker_done', label: 'Maker Done' },
    { value: 'payment_done', label: 'Payment Done' },
    { value: 'rejected', label: 'Rejected' },
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
    pending: 'Pending',
    maker_done: 'Maker Done',
    payment_done: 'Payment Done',
    rejected: 'Rejected',
};

// Status shown on the list/view. A fixed expense has no status of its own:
// until the cron links a maker request it is "Awaited Maker", afterwards the
// linked payment request's status is shown.
export const AWAITED_MAKER_STATUS = {
    label: 'Awaited Maker',
    className: 'bg-slate-100 text-slate-700 border-transparent',
};

export const FIXED_EXPENSE_STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-transparent',
    maker_done: 'bg-indigo-100 text-indigo-800 border-transparent',
    payment_done: 'bg-emerald-100 text-emerald-800 border-transparent',
    rejected: 'bg-red-100 text-red-800 border-transparent',
};

export const getFixedExpenseDisplayStatus = (row: {
    makerRequestStatus?: string | null;
}): { label: string; className: string } => {
    const status = row.makerRequestStatus;
    if (!status) return AWAITED_MAKER_STATUS;

    return {
        label: FIXED_EXPENSE_STATUS_LABELS[status] ?? status,
        className: FIXED_EXPENSE_STATUS_STYLES[status] ?? '',
    };
};
