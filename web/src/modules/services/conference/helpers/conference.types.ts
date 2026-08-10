import { z } from "zod";
import { tenderFilesService } from "@/services/api/tender-files.service";

export interface ConferenceAttachment {
    path: string;
    name?: string;
    type?: string;
}

export interface ConferenceCallReport {
    id: number;
    complaintId: number;
    issueDescription: string;
    materialsRequired: string | null;
    actionsPlanned: string | null;
    voiceRecordingPath: string | null;
    attachments: ConferenceAttachment[] | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ConferenceListItem {
    conferenceId: number | null;
    complaintId: number;
    ticketNo: string | null;
    siteProjectName: string | null;
    customerName: string | null;
    organization: string | null;
    siteLocation: string | null;
    complaintStatus: string | null;
    serviceEngineerName: string | null;
    engineerAllottedAt: string | null;
    createdAt: string;
}

export interface ConferenceListItemWithReport extends ConferenceListItem {
    hasReport: boolean;
}

export interface CreateConferenceCallReportDto {
    complaintId: number;
    issueDescription: string;
    materialsRequired?: string | null;
    actionsPlanned?: string | null;
    voiceRecordingPath?: string | null;
    attachments?: ConferenceAttachment[];
}

export type UpdateConferenceCallReportDto = Partial<CreateConferenceCallReportDto>;

export const ConferenceFormSchema = z.object({
    issueDescription: z.string().min(1, "Issue description is required"),
    materialsRequired: z.string().optional(),
    actionsPlanned: z.string().optional(),
    voiceRecordingPath: z.string().optional(),
    attachments: z.array(z.object({
        path: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
    })).default([]),
});

export type ConferenceFormValues = z.infer<typeof ConferenceFormSchema>;

export const conferenceFormDefaultValues: ConferenceFormValues = {
    issueDescription: "",
    materialsRequired: "",
    actionsPlanned: "",
    voiceRecordingPath: "",
    attachments: [],
};

export const conferenceAttachmentUrl = (value?: string | null): string =>
    value ? tenderFilesService.getFileUrl(value) : "";