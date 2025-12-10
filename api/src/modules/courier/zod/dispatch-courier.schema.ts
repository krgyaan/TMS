// src/modules/courier/zod/dispatch-courier.schema.ts
import { z } from "zod";

export const dispatchCourierSchema = z.object({
    courier_provider: z
        .string()
        .min(1, "Courier provider is required")
        .max(255, "Courier provider must be less than 255 characters")
        .transform(val => val.trim()),
    docket_no: z
        .string()
        .min(1, "Docket number is required")
        .max(255, "Docket number must be less than 255 characters")
        .transform(val => val.trim()),
    pickup_date: z
        .string()
        .min(1, "Pickup date is required")
        .refine(val => !isNaN(new Date(val).getTime()), "Invalid pickup date format"),
});

export type DispatchCourierDto = z.infer<typeof dispatchCourierSchema>;
