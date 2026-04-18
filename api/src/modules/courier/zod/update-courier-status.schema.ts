// update-status.schema.ts
import { z } from "zod";

export const UpdateCourierStatusSchema = z.object({
    status: z.coerce.number().int(),
    delivery_date: z.coerce.date().optional(),
    within_time: z.coerce.boolean().optional(),
});

export type UpdateCourierStatusInput = z.infer<typeof UpdateCourierStatusSchema>;
