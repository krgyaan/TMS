import * as z from "zod";

const TEAM_MEMBER_CATEGORY_ID = 22;

export const imprestFormSchema = z
    .object({
        userId: z.preprocess(
            v => (v === "" || v === undefined || v === null ? undefined : Number(v)),
            z.number().min(1, "User is required")
        ),

        categoryId: z.preprocess(
            v => {
                if (v === "" || v === undefined || v === null) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
            },
            z.number().min(1, "Category is required")
        ),

        partyName: z.string().optional().nullable(),
        projectName: z.string().optional().nullable(),
        transferToId: z.preprocess(
            v => (v === "" || v === undefined || v === null ? null : Number(v)),
            z.number().nullable().optional()
        ),

        amount: z.preprocess(
            v => {
                if (v === "" || v === undefined || v === null) return undefined;
                const num = Number(v);
                return isNaN(num) ? undefined : num;
            },
            z.number().int().min(1, "Amount must be greater than 0")
        ),

        dateOfExpense: z.preprocess(
            v => (v === "" || v === undefined || v === null ? undefined : new Date(v as string)),
            z.date({ error: "Expense Date is required" })
        ),

        remark: z.string().optional().nullable(),
    })
    .superRefine((data, ctx) => {
        const isTransferMode = Number(data.categoryId) === TEAM_MEMBER_CATEGORY_ID;

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
        } else {
            // 🚨 Transfer mode — the recipient is required instead
            if (!data.transferToId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Transfer user is required",
                    path: ["transferToId"],
                });
            }
        }
    });

export type ImprestFormValues = z.infer<typeof imprestFormSchema>;