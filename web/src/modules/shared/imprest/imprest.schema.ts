import * as z from "zod";

export const createImprestSchema = z.object({
    userId: z.preprocess(v => (v === "" || v === undefined ? undefined : Number(v)), z.number()),

    amount: z.preprocess(v => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(1)),

    categoryId: z.preprocess(v => (v === "" || v === undefined ? null : Number(v)), z.number().nullable()).optional(),

    teamId: z.preprocess(v => (v === "" || v === undefined ? null : Number(v)), z.number().nullable()).optional(),

    partyName: z.string().optional().nullable(),
    projectName: z.string().optional().nullable(),
    remark: z.string().optional().nullable(),
});

export type CreateImprestInput = z.infer<typeof createImprestSchema>;

export const updateImprestSchema = z.object({
    partyName: z.string().nullable().optional(),
    projectName: z.string().nullable().optional(),

    categoryId: z.preprocess(v => (v === "" || v === undefined ? null : Number(v)), z.number().nullable()).optional(),

    teamId: z.preprocess(v => (v === "" || v === undefined ? null : Number(v)), z.number().nullable()).optional(),

    amount: z.preprocess(v => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(1)).optional(),

    remark: z.string().nullable().optional(),
});

export type UpdateImprestInput = z.infer<typeof updateImprestSchema>;
