import * as z from "zod";

export const createImprestSchema = z.object({
    // strings
    partyName: z.string().optional().nullable(),
    projectName: z.string().optional().nullable(),
    remark: z.string().optional().nullable(),

    // relations
    categoryId: z.number().optional().nullable(),
    teamId: z.number().optional().nullable(),

    // numeric
    amount: z.number().int().min(1, "Amount must be at least 1"),
});

export type CreateImprestInput = z.infer<typeof createImprestSchema>;
