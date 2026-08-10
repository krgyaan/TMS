import { z } from "zod";

const ConferenceAttachmentSchema = z.object({
    path: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
});

export const CreateConferenceCallReportSchema = z.object({
    complaintId: z.number().int().positive(),
    issueDescription: z.string().min(1, "Issue description is required"),
    materialsRequired: z.string().optional().nullable(),
    actionsPlanned: z.string().optional().nullable(),
    voiceRecordingPath: z.string().optional().nullable(),
    attachments: z.array(ConferenceAttachmentSchema).default([]),
});

export const UpdateConferenceCallReportSchema = CreateConferenceCallReportSchema.partial();

export type CreateConferenceCallReportDto = z.infer<typeof CreateConferenceCallReportSchema>;
export type UpdateConferenceCallReportDto = z.infer<typeof UpdateConferenceCallReportSchema>;
