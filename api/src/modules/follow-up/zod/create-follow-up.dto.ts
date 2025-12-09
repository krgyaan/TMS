import { z } from "zod";

// Contact person schema
export const contactPersonSchema = z.object({
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
    categoryId: z.number().positive().nullable().optional(),
    assignedToId: z.number().positive("Assigned user is required"),
    comment: z.string().optional(),
    contacts: z.array(contactPersonSchema).min(1, "At least one contact person is required"),
    startFrom: z.string().optional(), // Will default to today if not provided
    emdId: z.number().positive().nullable().optional(),
});

export type CreateFollowUpDto = z.infer<typeof createFollowUpSchema>;
export type ContactPersonDto = z.infer<typeof contactPersonSchema>;
