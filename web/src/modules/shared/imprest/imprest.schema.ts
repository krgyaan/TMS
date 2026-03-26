import * as z from "zod";

const TEAM_MEMBER_CATEGORY_ID = 22;

export const createImprestSchema = z
    .object({
        userId: z.preprocess(v => (v === "" || v === undefined ? undefined : Number(v)), z.number()),

        amount: z.preprocess(v => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(1)),

        categoryId: z.preprocess(
            v => {
                if (v === "" || v === undefined || v === null) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
            },
            z.number().min(1, "Category is required")
        ),
        transferToId: z.preprocess(v => (v === "" || v === undefined ? null : Number(v)), z.number().nullable()).optional(),

        partyName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        remark: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        const isTransferMode = Number(data.categoryId) === TEAM_MEMBER_CATEGORY_ID;

        // 🚨 Only when NOT transfer mode
        if (!isTransferMode) {
            if (!data.partyName || data.partyName.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Party Name is required",
                    path: ["partyName"],
                });
            }

            if (!data.projectName || data.projectName.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Project is required",
                    path: ["projectName"],
                });
            }
        }
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
