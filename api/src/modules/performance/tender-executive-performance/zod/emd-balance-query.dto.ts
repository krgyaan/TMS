import { z } from "zod";

export const EmdBalanceQuerySchema = z.object({
    fromDate: z.string(), // yyyy-mm-dd
    toDate: z.string(), // yyyy-mm-dd

    userId: z.coerce.number().optional(),
    teamId: z.coerce.number().optional(),

    view: z.enum(["user", "team", "all"]).default("user"),
});

export type EmdBalanceQueryDto = z.infer<typeof EmdBalanceQuerySchema>;
