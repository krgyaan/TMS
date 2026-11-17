import { z } from "zod";

const optionalText = (message?: string) =>
    z.preprocess(
        val => (typeof val === "string" && val.trim() === "" ? null : val),
        z.string().trim().nullable().optional()
    );

const optionalEmail = z.preprocess(
    val => (typeof val === "string" && val.trim() === "" ? null : val),
    z.string().trim().email("Invalid email address").nullable().optional()
);

export const contactPersonFormSchema = z.object({
    id: z.number().optional(),
    name: z.string().trim().min(1, "Name is required"),
    designation: optionalText(),
    email: optionalEmail,
    phone: optionalText(),
    org: optionalText(),
});

export type ContactPersonFormValues = z.infer<typeof contactPersonFormSchema>;

export const followUpCreateFormSchema = z.object({
    area: z.string().min(1, "Area is required"),
    partyName: z.string().trim().min(1, "Organisation name is required"),
    assignedToId: z.number().int().positive("Assignee is required"),
    amount: z.string().optional(),
    followupFor: z.string().min(1, "Followup reason is required"),
    comment: z.string().optional(),
    contacts: z.array(contactPersonFormSchema).min(1, "Add at least one contact person"),
});

export type FollowUpCreateFormValues = z.infer<typeof followUpCreateFormSchema>;

export const followUpEditFormSchema = z
    .object({
        area: z.string().optional(),
        partyName: z.string().optional(),
        assignedToId: z.number().int().positive("Assignee is required").optional(),
        amount: z.union([z.string(), z.number()]).optional(),
        followupFor: z.string().optional(),
        details: z.string().optional(),
        frequency: z.number().int().min(1).max(8).optional(),
        startFrom: z.string().optional(),
        stopReason: z.number().int().min(1).max(4).nullable().optional(),
        proofText: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),
        proofImage: z.string().nullable().optional(),
        contacts: z.array(contactPersonFormSchema).min(1, "At least one contact person is required"),
    })
    .superRefine((data, ctx) => {
        if (data.frequency === 6 && !data.stopReason) {
            ctx.addIssue({
                code: "custom",
                message: "Stop reason is required when frequency is stopped",
                path: ["stopReason"],
            });
        }
        if (data.stopReason === 2 && !data.proofText?.trim()) {
            ctx.addIssue({
                code: "custom",
                message: "Proof details are required when objective is achieved",
                path: ["proofText"],
            });
        }
        if (data.stopReason === 4 && !data.stopRemarks?.trim()) {
            ctx.addIssue({
                code: "custom",
                message: "Remarks are required when stop reason is other",
                path: ["stopRemarks"],
            });
        }
    });

export type FollowUpEditFormValues = z.infer<typeof followUpEditFormSchema>;

export const followUpStatusFormSchema = z
    .object({
        frequency: z.number().int().min(1, "Frequency is required").max(8),
        nextFollowUpDate: z.string().optional(),
        latestComment: z.string().optional(),
        stopReason: z.number().int().min(1).max(4).nullable().optional(),
        proofText: z.string().nullable().optional(),
        stopRemarks: z.string().nullable().optional(),
        proofImage: z.string().nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.frequency === 6 && !data.stopReason) {
            ctx.addIssue({
                code: "custom",
                message: "Stop reason is required when frequency is stopped",
                path: ["stopReason"],
            });
        }
        if (data.frequency !== 6 && !data.nextFollowUpDate) {
            ctx.addIssue({
                code: "custom",
                message: "Next follow-up date is required",
                path: ["nextFollowUpDate"],
            });
        }
        if (data.stopReason === 2 && !data.proofText?.trim()) {
            ctx.addIssue({
                code: "custom",
                message: "Proof details are required when objective is achieved",
                path: ["proofText"],
            });
        }
        if (data.stopReason === 4 && !data.stopRemarks?.trim()) {
            ctx.addIssue({
                code: "custom",
                message: "Remarks are required when stop reason is other",
                path: ["stopRemarks"],
            });
        }
    });

export type FollowUpStatusFormValues = z.infer<typeof followUpStatusFormSchema>;
