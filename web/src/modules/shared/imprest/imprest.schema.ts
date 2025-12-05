import * as z from "zod";

export const createImprestSchema = z.object({
    party_name: z.string().optional().nullable(),
    project_name: z.string().optional().nullable(),
    amount: z.number().min(1, "Amount must be at least 1"),
    category: z.string().optional().nullable(),
    team_id: z.number().optional().nullable(),
    remark: z.string().optional().nullable(),
});

export type CreateImprestInput = z.infer<typeof createImprestSchema>;
