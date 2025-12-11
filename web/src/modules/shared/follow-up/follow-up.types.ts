import { z } from "zod";

/* =====================================
   CONTACT PERSON
===================================== */

export const ContactPersonSchema = z.object({
    name: z.string(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    org: z.string().nullable().optional(),
});

export type ContactPersonDto = z.infer<typeof ContactPersonSchema>;
const ContactPersonFormSchema = ContactPersonSchema.extend({
    // id is UI-only
    id: z.string(),
});

/* =====================================
   CREATE FOLLOW-UP DTO
===================================== */

export const CreateFollowUpSchema = z.object({
    area: z.string(),
    partyName: z.string(),

    amount: z.number().optional(),
    categoryId: z.number().nullable().optional(),

    assignedToId: z.number(),
    comment: z.string().optional(),

    contacts: z.array(ContactPersonSchema),

    startFrom: z.string().optional(), // ISO date
    emdId: z.number().nullable().optional(),
});

export type CreateFollowUpDto = z.infer<typeof CreateFollowUpSchema>;

export const CreateFollowUpFormSchema = z.object({
    area: z.string().min(1, "Area is required"),
    partyName: z.string().min(1, "Organisation name is required"),

    amount: z.string().optional(), // string in the form
    assignedTo: z.string().min(1, "Assignee is required"),

    comment: z.string().optional(),

    contacts: z.array(ContactPersonFormSchema).min(1, "Add at least one contact person"),

    followupFor: z.string().optional(),
});

export type CreateFollowUpFormValues = z.infer<typeof CreateFollowUpFormSchema>;

/* =====================================
   QUERY DTO (LIST FILTER)
===================================== */

export const FollowUpQuerySchema = z.object({
    tab: z.enum(["ongoing", "achieved", "angry", "future", "all"]).optional(),

    assignedToId: z.number().optional(),
    search: z.string().optional(),

    page: z.number().optional(),
    limit: z.number().optional(),

    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type FollowUpQueryDto = z.infer<typeof FollowUpQuerySchema>;

/* =====================================
   UPDATE STATUS DTO
===================================== */

export const FrequencySchema = z.enum(["daily", "alternate", "weekly", "biweekly", "monthly", "stopped"]);

export type Frequency = z.infer<typeof FrequencySchema>;

export const StopReasonSchema = z.enum(["party_angry", "objective_achieved", "not_reachable", "other"]);

export type StopReason = z.infer<typeof StopReasonSchema>;

export const UpdateFollowUpStatusSchema = z
    .object({
        latestComment: z.string().min(1, "Comment is required"),

        nextFollowUpDate: z.string().nullable().optional(),

        frequency: FrequencySchema.optional(),

        stopReason: StopReasonSchema.nullable().optional(),

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

export type UpdateFollowUpStatusDto = z.infer<typeof UpdateFollowUpStatusSchema>;

/* =====================================
   UPDATE FOLLOW-UP DTO (EDIT PAGE)
===================================== */

export const UpdateFollowUpSchema = z.object({
    area: z.string().optional(),
    partyName: z.string().optional(),

    amount: z.number().optional(),
    categoryId: z.number().nullable().optional(),

    assignedToId: z.number().optional(),
    details: z.string().optional(),

    contacts: z.array(ContactPersonSchema).optional(),

    // Scheduling
    frequency: FrequencySchema.optional(),
    startFrom: z.string().optional(),

    // Stop fields
    stopReason: StopReasonSchema.nullable().optional(),
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    // Attachments
    attachments: z.array(z.string()).optional(),
});

export type UpdateFollowUpDto = z.infer<typeof UpdateFollowUpSchema>;

/* =====================================
   FOLLOW-UP LIST ROW (API RESPONSE TYPE)
===================================== */

export const FollowUpRowSchema = z.object({
    id: z.number(),

    area: z.string(),
    party_name: z.string(),

    amount: z.number(),

    frequency: FrequencySchema,
    frequencyLabel: z.string().optional(),

    status: z.string(),
    latest_comment: z.string().nullable().optional(),

    updated_at: z.string().optional(),
    created_at: z.string().optional(),
    start_from: z.string().optional(),

    assigned_to_id: z.number().optional(),

    followPerson: z.array(ContactPersonSchema).optional(),

    stop_reason: StopReasonSchema.nullable().optional(),
    stopReasonLabel: z.string().nullable().optional(),
});

export type FollowUpRow = z.infer<typeof FollowUpRowSchema>;

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
    contacts: z.array(ContactPersonSchema),

    // Attachments
    attachments: z.array(z.string()).optional(),

    // Metadata
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type FollowUpDetailsDto = z.infer<typeof FollowUpDetailsSchema>;
