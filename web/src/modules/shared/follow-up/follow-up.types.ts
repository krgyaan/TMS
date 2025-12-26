import { z } from "zod";

export const UserMiniSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().optional(),
});

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
    id: z.string(), // UI-only
});

/* =====================================
   NUMERIC ENUMS (CANONICAL)
===================================== */

export const FrequencyEnum = z.number().int().min(1).max(6);
/*
1 = Daily
2 = Alternate Days
3 = Weekly
4 = Bi-Weekly
5 = Monthly
6 = Stopped
*/

export type Frequency = z.infer<typeof FrequencyEnum>;

export const StopReasonEnum = z.number().int().min(1).max(4);
/*
1 = Party Angry / Not Interested
2 = Objective Achieved
3 = Not Reachable
4 = Other
*/

export type StopReason = z.infer<typeof StopReasonEnum>;

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

    startFrom: z.string().optional(), // YYYY-MM-DD
    emdId: z.number().nullable().optional(),
});

export type CreateFollowUpDto = z.infer<typeof CreateFollowUpSchema>;

export const CreateFollowUpFormSchema = z.object({
    area: z.string().min(1, "Area is required"),
    partyName: z.string().min(1, "Organisation name is required"),

    amount: z.string().optional(),
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
   UPDATE FOLLOW-UP STATUS DTO
===================================== */

export const UpdateFollowUpStatusSchema = z
    .object({
        latestComment: z.string().min(1, "Comment is required"),

        nextFollowUpDate: z.string().nullable().optional(),

        frequency: FrequencyEnum.optional(),

        stopReason: StopReasonEnum.nullable().optional(),

        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),
    })
    .refine(
        data => {
            if (data.frequency === 6 && !data.stopReason) return false;
            return true;
        },
        {
            message: "Stop reason is required when frequency is stopped",
            path: ["stopReason"],
        }
    )
    .refine(
        data => {
            if (data.stopReason === 2 && !data.proofText) return false;
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
    details: z.string().nullable().optional(),

    contacts: z.array(ContactPersonSchema).optional(),

    // Scheduling
    frequency: FrequencyEnum.optional(),
    startFrom: z.string().nullable().optional(),

    // Stop fields
    stopReason: StopReasonEnum.nullable().optional(),
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),
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

    frequency: z.number(), // 1–6
    frequencyLabel: z.string().optional(),

    status: z.string(),
    latestComment: z.string().nullable().optional(),

    updatedAt: z.string().optional(),
    createdAt: z.string().optional(),
    startFrom: z.string().optional(),

    assignedToId: z.number().optional(),
    createdById: z.number().optional(),

    assignee: UserMiniSchema.nullable().optional(),
    creator: UserMiniSchema.nullable().optional(),

    followPerson: z.array(ContactPersonSchema).optional(),

    stopReason: z.number().nullable().optional(), // 1–4
    stopReasonLabel: z.string().nullable().optional(),
});

export type FollowUpRow = z.infer<typeof FollowUpRowSchema>;

/* =====================================
   FOLLOW-UP DETAILS (EDIT PAGE LOAD)
===================================== */

export const FollowUpDetailsSchema = z.object({
    id: z.number(),

    area: z.string(),
    partyName: z.string(),

    amount: z.number().nullable().optional(),
    categoryId: z.number().nullable().optional(),

    assignedToId: z.number(),
    createdById: z.number(),
    details: z.string().nullable().optional(),

    status: z.string(),

    // Scheduling
    frequency: z.number().optional(), // 1–6
    startFrom: z.string().nullable().optional(),

    // Stop fields
    stopReason: z.number().nullable().optional(), // 1–4
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    followPerson: z.array(ContactPersonSchema).optional(),

    // Contacts
    contacts: z.array(ContactPersonSchema),

    // Attachments
    attachments: z.array(z.string()).optional(),

    // Metadata
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type FollowUpDetailsDto = z.infer<typeof FollowUpDetailsSchema>;
