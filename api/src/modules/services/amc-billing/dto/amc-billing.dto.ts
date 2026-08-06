import { z } from "zod";

export const CreateAmcBillingSchema = z.object({
    amcId: z.number().int().positive(),
    amcSiteId: z.number().int().positive().nullable().optional(),
    serviceDueDate: z.string().date().nullable().optional(),
    serviceCompletedDate: z.string().datetime().nullable().optional(),
    notes: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    invoice: z.string().nullable().optional(),
    paymentReceipt: z.string().nullable().optional(),
});

export const UpdateAmcBillingSchema = CreateAmcBillingSchema.partial();

export type CreateAmcBillingDto = z.infer<typeof CreateAmcBillingSchema>;
export type UpdateAmcBillingDto = z.infer<typeof UpdateAmcBillingSchema>;