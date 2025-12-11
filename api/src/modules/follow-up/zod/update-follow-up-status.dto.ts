import { z } from "zod";

const frequencyValues = ["daily", "alternate", "weekly", "biweekly", "monthly", "stopped"] as const;

const stopReasonValues = ["party_angry", "objective_achieved", "not_reachable", "other"] as const;

// Update status schema (for modal quick update)
export const updateFollowUpStatusSchema = z
    .object({
        latestComment: z.string().min(1, "Comment is required"),
        nextFollowUpDate: z.string().nullable().optional(),
        frequency: z.enum(frequencyValues).optional(),
        stopReason: z.enum(stopReasonValues).nullable().optional(),
        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),
    })
    .refine(
        data => {
            if (data.frequency === "stopped" && !data.stopReason) {
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
            if (data.stopReason === "objective_achieved" && !data.proofText) {
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
