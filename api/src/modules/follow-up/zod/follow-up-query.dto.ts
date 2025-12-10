import { z } from "zod";

export const followUpQuerySchema = z.object({
    tab: z.enum(["ongoing", "achieved", "angry", "future", "all"]).optional().default("all"),
    assignedToId: z
        .string()
        .transform(val => parseInt(val, 10))
        .optional(),
    search: z.string().optional(),
    page: z
        .string()
        .transform(val => parseInt(val, 10))
        .optional()
        .default("1"),
    limit: z
        .string()
        .transform(val => parseInt(val, 10))
        .optional()
        .default("50"),
    sortBy: z.string().optional().default("startFrom"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type FollowUpQueryDto = z.infer<typeof followUpQuerySchema>;
