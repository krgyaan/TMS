import { z } from "zod";

// Update status schema (for modal quick update)
export const updateFollowUpStatusSchema = z
    .object({
        latestComment: z.string().optional(),
        nextFollowUpDate: z.string().nullable().optional(),
        frequency: z.union([z.string(), z.number()]).transform(v => Number(v)).optional(),
        stopReason: z.union([z.string(), z.number()]).transform(v => Number(v)).nullable().optional(),
        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),
    })
    .refine(
        data => {
            if (data.frequency === 6 && !data.stopReason) {
                return false;
            }
            return true;
        },
        {
            message: "Stop reason is required when frequency is stopped",
            path: ["stopReason"],
        }
    )
    .refine(
        data => {
            if (data.stopReason === 2 && !data.proofText) {
                return false;
            }
            return true;
        },
        {
            message: "Proof text is required when objective is achieved",
            path: ["proofText"],
        }
    );

export type UpdateFollowUpStatusDto = z.infer<typeof updateFollowUpStatusSchema>;
