import { z } from "zod";

export const dispatchCourierSchema = z.object({
    courierProvider: z
        .string()
        .min(1, "Courier provider is required")
        .max(255)
        .transform(v => v.trim()),

    docketNo: z
        .string()
        .min(1, "Docket number is required")
        .max(255)
        .transform(v => v.trim()),

    pickupDate: z
        .string()
        .min(1, "Pickup date is required")
        .refine(v => !isNaN(Date.parse(v)), "Invalid pickup date format"),
});

export type DispatchCourierDto = z.infer<typeof dispatchCourierSchema>;
