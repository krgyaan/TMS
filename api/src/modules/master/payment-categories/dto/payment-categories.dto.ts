import { z } from "zod";

export const PAYMENT_CATEGORY_STATUSES = ["active", "inactive"] as const;

export type PaymentCategoryStatus = (typeof PAYMENT_CATEGORY_STATUSES)[number];

export const ListPaymentCategoriesQuerySchema = z.object({
    purpose: z.string().trim().max(50).optional(),
    status: z.enum(PAYMENT_CATEGORY_STATUSES).optional(),
    q: z.string().trim().max(100).optional(),
});

export type ListPaymentCategoriesQuery = z.infer<typeof ListPaymentCategoriesQuerySchema>;

export const CreatePaymentCategorySchema = z.object({
    purpose: z.string().trim().min(1).max(50).default("fixed"),
    category: z.string().trim().min(1, "Category is required").max(100),
    subCategory: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .nullable()
        .transform(value => value || null),
    status: z.enum(PAYMENT_CATEGORY_STATUSES).default("active"),
});

export type CreatePaymentCategoryDto = z.infer<typeof CreatePaymentCategorySchema>;
