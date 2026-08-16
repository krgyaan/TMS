import { z } from "zod";

export const UpdateCourierStatusSchema = z.object({
    status: z.coerce.number().int(),
    delivery_date: z.coerce.date().optional(),
    within_time: z.coerce.boolean().optional(),
    podDoc: z.string().optional(),
});

export type UpdateCourierStatusInput = z.infer<typeof UpdateCourierStatusSchema>;
