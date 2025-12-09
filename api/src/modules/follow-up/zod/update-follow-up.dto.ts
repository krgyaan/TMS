import { z } from "zod";
import { contactPersonSchema } from "./create-follow-up.dto";

// Frequency enum values
const frequencyValues = ["daily", "alternate", "weekly", "biweekly", "monthly", "stopped"] as const;

// Stop reason enum values
const stopReasonValues = ["party_angry", "objective_achieved", "not_reachable", "other"] as const;

// Update follow-up schema (for edit page)
export const updateFollowUpSchema = z
    .object({
        area: z.string().min(1).optional(),
        partyName: z.string().min(1).optional(),
        amount: z
            .union([z.string(), z.number()])
            .transform(val => (typeof val === "string" ? parseFloat(val) || 0 : val))
            .optional(),
        categoryId: z.number().positive().nullable().optional(),
        assignedToId: z.number().positive().optional(),
        details: z.string().optional(),
        contacts: z.array(contactPersonSchema).optional(),

        // Scheduling
        frequency: z.enum(frequencyValues).optional(),
        startFrom: z.string().optional(),

        // Stop fields
        stopReason: z.enum(stopReasonValues).nullable().optional(),
        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),

        // Attachments
        attachments: z.array(z.string()).optional(),
    })
    .refine(
        data => {
            // If frequency is 'stopped', stopReason is required
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
            // If stopReason is 'objective_achieved', proofText is required
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

export const FollowUpDetailsSchema = z.object({
    id: z.number(),

    area: z.string(),
    partyName: z.string(),

    amount: z.number().nullable().optional(),
    categoryId: z.number().nullable().optional(),

    assignedToId: z.number(),
    details: z.string().nullable().optional(),

    status: z.string(),

    // Scheduling
    frequency: z.enum(["daily", "alternate", "weekly", "biweekly", "monthly", "stopped"]).optional(),
    startFrom: z.string().nullable().optional(),

    // Stop fields
    stopReason: z.enum(["party_angry", "objective_achieved", "not_reachable", "other"]).nullable().optional(),
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    // Contacts
    contacts: z.array(contactPersonSchema),

    // Attachments
    attachments: z.array(z.string()).optional(),

    // Metadata
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type FollowUpDetailsDto = z.infer<typeof FollowUpDetailsSchema>;

export type UpdateFollowUpDto = z.infer<typeof updateFollowUpSchema>;
