import { z } from "zod";

/* =====================================
   CONTACT PERSON
===================================== */

export const userMiniSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().nullable().optional(),
});

export const contactPersonSchema = z.object({
    id: z.number().optional(),
    followUpId: z.number().optional(),
    name: z.string().nullable().optional(),
    designation: z.preprocess(
        val => (typeof val === "string" && val.trim() === "" ? null : val),
        z.string().trim().nullable().optional()
    ),
    email: z.preprocess(
        val => (typeof val === "string" && val.trim() === "" ? null : val),
        z.string().trim().email().nullable().optional()
    ),
    phone: z.preprocess(
        val => (typeof val === "string" && val.trim() === "" ? null : val),
        z.string().trim().nullable().optional()
    ),
    org: z.preprocess(
        val => (typeof val === "string" && val.trim() === "" ? null : val),
        z.string().trim().nullable().optional()
    ),
});

export type ContactPersonDto = z.infer<typeof contactPersonSchema>;

/* =====================================
   CREATE FOLLOW-UP
===================================== */

export const createFollowUpSchema = z.object({
    area: z.string().min(1, "Area is required"),
    partyName: z.string().min(1, "Organisation name is required"),

    amount: z
        .union([z.string(), z.number()])
        .transform(val => (typeof val === "string" ? parseFloat(val) || 0 : val))
        .optional()
        .default(0),

    followupFor: z.string().min(1, "Followup reason is required"),

    assignedToId: z.number().nonnegative().nullable(),
    createdById: z.number().nonnegative().nullable().optional(),

    comment: z.string().nullable().optional(),
    details: z.string().nullable().optional(),

    assignmentStatus: z.string().optional(),

    contacts: z.array(contactPersonSchema).min(1, "At least one contact person is required"),

    startFrom: z.string().optional(),
    nextFollowUpDate: z.string().nullable().optional(),

    latestComment: z.string().nullable().optional(),

    frequency: z.union([z.string(), z.number()]).transform(v => Number(v)).optional().nullable(),

    stopReason: z.union([z.string(), z.number()]).transform(v => Number(v)).nullable().optional(),

    reminderCount: z.number().int().min(1).optional(),

    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    attachments: z.array(z.string()).optional().default([]),
    followUpHistory: z.array(z.any()).optional().default([]),
    emdId: z.number().positive().nullable().optional(),
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;

/* =====================================
   UPDATE FOLLOW-UP
===================================== */

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

        frequency: z.union([z.string(), z.number()]).transform(v => Number(v)).nullable().optional(),
        startFrom: z.string().nullable().optional(),
        nextFollowUpDate: z.string().nullable().optional(),

        stopReason: z.union([z.string(), z.number()]).transform(v => Number(v)).nullable().optional(),
        proofText: z.string().nullable().optional(),
        proofImagePath: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),

        removedAttachments: z.array(z.string()).optional(),
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

export type UpdateFollowUpDto = z.infer<typeof updateFollowUpSchema>;

/* =====================================
   UPDATE FOLLOW-UP STATUS (QUICK MODAL)
===================================== */

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

export type UpdateFollowUpStatusDto = z.infer<typeof updateFollowUpStatusSchema>;

/* =====================================
   LIST QUERY
===================================== */

export const followUpQuerySchema = z.object({
    tab: z.enum(["ongoing", "achieved", "angry", "future", "all"]).optional().default("all"),
    assignedToId: z.coerce.number().int().optional(),
    createdById: z.coerce.number().int().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).optional().default(50),
    sortBy: z.string().optional().default("startFrom"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type FollowUpQueryDto = z.infer<typeof followUpQuerySchema>;

/* =====================================
   DETAILS RESPONSE
===================================== */

export const followUpDetailsSchema = z.object({
    id: z.number(),

    area: z.string(),
    partyName: z.string(),

    amount: z.number().nullable().optional(),
    followupFor: z.string().nullable().optional(),

    assignedToId: z.number().nullable().optional(),
    createdById: z.number().nullable().optional(),
    details: z.string().nullable().optional(),

    status: z.string(),

    frequency: z.number().optional().nullable(),
    startFrom: z.string().nullable().optional(),
    nextFollowUpDate: z.string().nullable().optional(),

    stopReason: z.number().int().nullable().optional(),
    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    followUpHistory: z.array(z.any()).optional().default([]),
    reminderCount: z.number().optional().default(0),

    emdId: z.number().positive().nullable().optional(),

    contacts: z.array(contactPersonSchema),
    attachments: z.array(z.string()).optional(),

    assignee: userMiniSchema.nullable().optional(),
    creator: userMiniSchema.nullable().optional(),

    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
});

export type FollowUpDetailsDto = z.infer<typeof followUpDetailsSchema>;
