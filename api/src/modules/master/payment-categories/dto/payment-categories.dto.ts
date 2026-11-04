import { z } from "zod";

export const ListPaymentCategoriesQuerySchema = z.object({
    purpose: z.string().trim().max(50).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    q: z.string().trim().max(100).optional(),
});

export type ListPaymentCategoriesQuery = z.infer<typeof ListPaymentCategoriesQuerySchema>;

export const PAYMENT_CATEGORY_STATUSES = ["active", "inactive"] as const;

export type PaymentCategoryStatus = (typeof PAYMENT_CATEGORY_STATUSES)[number];
