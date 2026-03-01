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

    pickupDate: z.coerce.date(),
});

export const CreateDispatchSchema = z.object({
    courierProvider: z.string().min(1),
    docketNo: z.string().min(1),
    pickupDate: z.coerce.date(), // expects YYYY-MM-DD
});

export type CreateDispatchInput = z.infer<typeof CreateDispatchSchema>;

export type DispatchCourierDto = z.infer<typeof dispatchCourierSchema>;
