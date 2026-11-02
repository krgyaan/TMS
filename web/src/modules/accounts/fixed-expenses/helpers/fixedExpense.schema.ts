import { z } from 'zod';

// ===================== ENUM VALUES =====================

export const FIXED_EXPENSE_TYPES = [
    'imprest',
    'communication',
    'courier',
    'electricity',
    'rent',
    'emi',
    'salary',
    'software',
    'office_expenses',
    'printing_stationary',
    'office_maintenance',
    'portal_renewal_charges',
    'professional_charges',
    'insurance',
    'registration_charges',
    'pop_charges',
    'bank_charges',
    'diwali_gift_expenses',
] as const;

export const FIXED_EXPENSE_FREQUENCIES = [
    'monthly',
    'quarterly',
    'half_yearly',
    'annual',
] as const;

export const FIXED_EXPENSE_PAYMENT_MODES = ['auto_debit', 'bank_transfer'] as const;

export const FIXED_EXPENSE_AMOUNT_TYPES = ['fixed', 'variable'] as const;

// ===================== FORM SCHEMA =====================

export const FixedExpenseFormSchema = z
    .object({
        partyName: z.string().trim().min(1, 'Party name is required').max(255),
        amountType: z.enum(FIXED_EXPENSE_AMOUNT_TYPES).default('fixed'),
        amount: z
            .string()
            .min(1, 'Amount is required')
            .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format (up to 2 decimals)'),
        paymentMode: z.enum(FIXED_EXPENSE_PAYMENT_MODES).default('auto_debit'),
        accountName: z.string().max(255).optional(),
        accountNumber: z.string().max(100).optional(),
        ifscCode: z.string().max(50).optional(),
        type: z.enum(FIXED_EXPENSE_TYPES),
        dueDate: z.string().min(1, 'Due date is required'),
        paymentFrequency: z.enum(FIXED_EXPENSE_FREQUENCIES).default('monthly'),
    })
    .superRefine((data, ctx) => {
        if (data.paymentMode !== 'bank_transfer') return;

        const requiredFields: Array<[keyof typeof data, string]> = [
            ['accountName', 'Account name'],
            ['accountNumber', 'Account number'],
            ['ifscCode', 'IFSC code'],
        ];

        for (const [field, label] of requiredFields) {
            const value = data[field];
            if (!value || String(value).trim() === '') {
                ctx.addIssue({
                    code: 'custom',
                    path: [field],
                    message: `${label} is required for bank transfer`,
                });
            }
        }
    });

export type FixedExpenseFormValues = z.infer<typeof FixedExpenseFormSchema>;
