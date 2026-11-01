import { z } from "zod";

// ===================== COMMON VALIDATORS =====================

const decimalString = z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format. Use up to 2 decimal places")
    .or(z.number().transform(val => val.toString()));

const dateString = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    .or(z.date().transform(val => val.toISOString().split("T")[0]));

const optionalString = (max: number) => z.string().trim().max(max).optional().nullable();

// ===================== ENUM VALUES =====================

export const FIXED_EXPENSE_TYPES = ["electricity", "rent", "salary", "communication", "software", "admin"] as const;

export const FIXED_EXPENSE_FREQUENCIES = ["monthly", "quarterly", "half_yearly", "annual"] as const;

export const FIXED_EXPENSE_PAYMENT_MODES = ["auto_debit", "bank_transfer"] as const;

export const FIXED_EXPENSE_AMOUNT_TYPES = ["fixed", "variable"] as const;

// ===================== FIXED EXPENSE DTOs =====================

const fixedExpenseBaseSchema = z.object({
    partyName: z.string().trim().min(1, "Party name is required").max(255),
    amountType: z.enum(FIXED_EXPENSE_AMOUNT_TYPES).default("fixed"),
    amount: decimalString,
    paymentMode: z.enum(FIXED_EXPENSE_PAYMENT_MODES).default("auto_debit"),
    accountName: optionalString(255),
    accountNumber: optionalString(100),
    ifscCode: optionalString(50),
    type: z.enum(FIXED_EXPENSE_TYPES),
    dueDate: dateString,
    paymentFrequency: z.enum(FIXED_EXPENSE_FREQUENCIES).default("monthly"),
    makerId: z.number().int().positive().optional().nullable(),
});

const requireBankDetailsWhenBankTransfer = (
    data: {
        paymentMode?: (typeof FIXED_EXPENSE_PAYMENT_MODES)[number];
        accountName?: string | null;
        accountNumber?: string | null;
        ifscCode?: string | null;
    },
    ctx: z.RefinementCtx
) => {
    if (data.paymentMode !== "bank_transfer") return;

    const requiredFields: Array<[keyof typeof data, string]> = [
        ["accountName", "Account name"],
        ["accountNumber", "Account number"],
        ["ifscCode", "IFSC code"],
    ];

    for (const [field, label] of requiredFields) {
        const value = data[field];
        if (!value || String(value).trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `${label} is required for bank transfer`,
                path: [field],
            });
        }
    }
};

export const createFixedExpenseSchema = fixedExpenseBaseSchema.superRefine(requireBankDetailsWhenBankTransfer);

export const updateFixedExpenseSchema = fixedExpenseBaseSchema.partial();

export const fixedExpenseQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    type: z.enum(FIXED_EXPENSE_TYPES).optional(),
    paymentFrequency: z.enum(FIXED_EXPENSE_FREQUENCIES).optional(),
    paymentMode: z.enum(FIXED_EXPENSE_PAYMENT_MODES).optional(),
    amountType: z.enum(FIXED_EXPENSE_AMOUNT_TYPES).optional(),
    sortBy: z.enum(["partyName", "amount", "type", "dueDate", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ===================== TYPES =====================

export type CreateFixedExpenseDto = z.infer<typeof createFixedExpenseSchema>;
export type UpdateFixedExpenseDto = z.infer<typeof updateFixedExpenseSchema>;
export type FixedExpenseQuery = z.infer<typeof fixedExpenseQuerySchema>;

export type FixedExpenseType = (typeof FIXED_EXPENSE_TYPES)[number];
export type FixedExpenseFrequency = (typeof FIXED_EXPENSE_FREQUENCIES)[number];
export type FixedExpensePaymentMode = (typeof FIXED_EXPENSE_PAYMENT_MODES)[number];
export type FixedExpenseAmountType = (typeof FIXED_EXPENSE_AMOUNT_TYPES)[number];

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
    makerId: number | null;
    makerName?: string | null;
    createdBy: number;
    createdByName?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface FixedExpenseListMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
