import { z } from "zod";

const complaintBaseSchema = {
    complaintType: z.string().min(1).max(100),
    subject: z.string().min(1).max(500),
    description: z.string().min(1),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    complaintAgainst: z.enum(["person", "department", "system", "policy", "facility"]).optional(),
    complaintAgainstId: z.number().int().positive().optional().nullable(),
    incidentDate: z.string().optional(),
    incidentLocation: z.string().max(255).optional(),
    previousAttempts: z.string().max(10000).optional(),
    witnesses: z.string().max(10000).optional(),
    expectedResolution: z.string().max(10000).optional(),
    attachments: z.array(z.string()).max(10).default([]),
};

export const CreateComplaintSchema = z.object(complaintBaseSchema);
export const UpdateComplaintSchema = z.object(complaintBaseSchema).partial();

export const UpdateStatusSchema = z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed", "rejected"]),
    remarks: z.string().max(10000).optional(),
});

export type CreateComplaintDto = z.infer<typeof CreateComplaintSchema>;
export type UpdateComplaintDto = z.infer<typeof UpdateComplaintSchema>;
export type UpdateStatusDto = z.infer<typeof UpdateStatusSchema>;
