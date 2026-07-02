import { z } from "zod";

export const StageBacklogQuerySchema = z.object({
    fromDate: z.string(),
    toDate: z.string(),

    userId: z.coerce.number().optional(),
    teamId: z.coerce.number().optional(),

    view: z.enum(["user", "team", "all"]).default("user"),
});

export type StageBacklogQueryDto = z.infer<typeof StageBacklogQuerySchema>;
