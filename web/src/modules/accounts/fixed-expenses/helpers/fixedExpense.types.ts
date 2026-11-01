import type { FixedExpenseFormValues } from './fixedExpense.schema';

// ===================== ENUM TYPES =====================

export type FixedExpenseType =
    | 'electricity'
    | 'rent'
    | 'salary'
    | 'communication'
    | 'software'
    | 'admin';

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
    type: FixedExpenseType;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    deleteStatus: boolean;
    makerId: number | null;
    makerName?: string | null;
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
    type?: FixedExpenseType;
    paymentFrequency?: FixedExpenseFrequency;
    paymentMode?: FixedExpensePaymentMode;
    amountType?: FixedExpenseAmountType;
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
    type: FixedExpenseType;
    dueDate: string;
    paymentFrequency: FixedExpenseFrequency;
    makerId?: number | null;
}

export type UpdateFixedExpenseDto = Partial<CreateFixedExpenseDto>;

export type { FixedExpenseFormValues };

// ===================== OPTION CONSTANTS =====================

export type FixedExpenseSelectOption = { value: string; label: string };

export const FIXED_EXPENSE_TYPE_OPTIONS: FixedExpenseSelectOption[] = [
    { value: 'electricity', label: 'Electricity' },
    { value: 'rent', label: 'Rent' },
    { value: 'salary', label: 'Salary' },
    { value: 'communication', label: 'Communication' },
    { value: 'software', label: 'Software' },
    { value: 'admin', label: 'Admin' },
];

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

export const FIXED_EXPENSE_STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
] as const;

export type FixedExpenseStatusFilter = (typeof FIXED_EXPENSE_STATUS_OPTIONS)[number]['value'];

// ===================== LABEL MAPS =====================

export const FIXED_EXPENSE_TYPE_LABELS: Record<FixedExpenseType, string> = {
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
