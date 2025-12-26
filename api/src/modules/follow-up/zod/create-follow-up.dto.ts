import { z } from "zod";

// Contact person schema
export const contactPersonSchema = z.object({
    id: z.number().optional(),
    followUpId: z.number().optional(),
    name: z.string().min(1, "Contact name is required"),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    org: z.string().nullable().optional(),
});

// Create follow-up schema
export const createFollowUpSchema = z.object({
    area: z.string().min(1, "Area is required"),
    partyName: z.string().min(1, "Organisation name is required"),

    amount: z
        .union([z.string(), z.number()])
        .transform(val => (typeof val === "string" ? parseFloat(val) || 0 : val))
        .optional()
        .default(0),

    // VARCHAR(50) in DB
    followupFor: z.string().nullable().optional(),

    assignedToId: z.number().positive().nullable(), // DB allows NULL
    createdById: z.number().positive().nullable(), // DB allows NULL

    comment: z.string().nullable().optional(),
    details: z.string().nullable().optional(),

    contacts: z.array(contactPersonSchema).min(1, "At least one contact person is required"),

    startFrom: z.string().optional(), // validated later as date
    nextFollowUpDate: z.string().nullable().optional(),

    latestComment: z.string().nullable().optional(),

    // numeric frequency (DB uses smallint)
    frequency: z.number().int().optional().nullable(),

    // numeric stop reason (DB uses smallint)
    stopReason: z.number().int().nullable().optional(),

    reminderCount: z.number().int().min(1).optional(),

    proofText: z.string().nullable().optional(),
    proofImagePath: z.string().nullable().optional(),
    stopRemarks: z.string().nullable().optional(),

    attachments: z.array(z.string()).optional().default([]),
    followUpHistory: z.array(z.any()).optional().default([]), // will refine later
    emdId: z.number().positive().nullable().optional(),
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
export type ContactPersonDto = z.infer<typeof contactPersonSchema>;
