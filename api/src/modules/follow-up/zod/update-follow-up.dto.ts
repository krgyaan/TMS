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

        followupFor: z.string().nullable().optional(),

        assignedToId: z.number().nullable().optional(),
        createdById: z.number().nullable().optional(),

        details: z.string().optional(),

        contacts: z.array(contactPersonSchema).optional(),

        // Scheduling
        frequency: z.number().nullable().optional(),
        startFrom: z.string().nullable().optional(),

        // Stop fields
        stopReason: z.number().int().nullable().optional(),
        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),

        // Attachments (control only)
        removedAttachments: z.array(z.string()).optional(),
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

export const FollowUpDetailsSchema = z.object({
    id: z.number(),

    area: z.string(),
    partyName: z.string(),

    amount: z.number().nullable().optional(),
    followupFor: z.string().nullable().optional(),

    assignedToId: z.number().nullable().optional(),
    details: z.string().nullable().optional(),

    status: z.string(),

    // Scheduling
    frequency: z.number().optional().nullable(),
    startFrom: z.string().nullable().optional(),

    nextFollowUpDate: z.string().nullable().optional(),

    // Stop fields
    stopReason: z.number().int().nullable().optional(),
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    followUpHistory: z.array(z.any()).optional().default([]),

    // Contacts
    contacts: z.array(contactPersonSchema),

    // Attachments
    attachments: z.array(z.string()).optional(),

    // Metadata
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
});

export type FollowUpDetailsDto = z.infer<typeof FollowUpDetailsSchema>;

export type UpdateFollowUpDto = z.infer<typeof updateFollowUpSchema>;
