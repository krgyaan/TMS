import { z } from "zod";

export const CreateServiceFeedbackSchema = z.object({
    complaintId: z.number().int().positive(),
    problemResolved: z.enum(["0", "1"]),
    satisfaction: z
        .number({ coerce: true })
        .int()
        .min(1, "Minimum rating is 1")
        .max(5, "Maximum rating is 5")
        .optional()
        .nullable(),
    suggestions: z.string().min(1).optional().nullable(),
});

export const UpdateServiceFeedbackSchema = CreateServiceFeedbackSchema.partial();

export type CreateServiceFeedbackDto = z.infer<typeof CreateServiceFeedbackSchema>;
export type UpdateServiceFeedbackDto = z.infer<typeof UpdateServiceFeedbackSchema>;
