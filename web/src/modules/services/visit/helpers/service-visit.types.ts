import { z } from "zod";
import { fileUploadService } from "@/services/api/file-upload.service";

export interface ServiceVisitAttachment {
    path: string;
    name?: string;
    type?: string;
}

export interface ServiceVisitReport {
    id: number;
    complaintId: number;
    serviceEngineerId: number | null;
    remarks: string;
    resolutionDone: "0" | "1" | null;
    unsignedPhoto: ServiceVisitAttachment[] | null;
    signedPhoto: ServiceVisitAttachment[] | null;
    resolvedPhoto: ServiceVisitAttachment[] | null;
    visitDate: string | null;
    uploadedBy: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceVisitListItem {
    reportId: number | null;
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

export interface ServiceVisitListItemWithReport extends ServiceVisitListItem {
    hasReport: boolean;
}

export interface CreateServiceVisitReportDto {
    complaintId: number;
    serviceEngineerId?: number | null;
    remarks: string;
    resolutionDone?: "0" | "1" | null;
    unsignedPhoto?: ServiceVisitAttachment[];
    signedPhoto?: ServiceVisitAttachment[];
    resolvedPhoto?: ServiceVisitAttachment[];
    visitDate?: string | null;
}

export type UpdateServiceVisitReportDto = Partial<CreateServiceVisitReportDto>;

export const ServiceVisitFormSchema = z.object({
    visitDate: z.string().optional(),
    resolutionDone: z.enum(["0", "1"]).optional(),
    remarks: z.string().min(1, "Remarks are required"),
    resolvedPhoto: z.array(z.object({
        path: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
    })).default([]),
    signedPhoto: z.array(z.object({
        path: z.string(),
        name: z.string().optional(),
        type: z.string().optional(),
    })).default([]),
});

export type ServiceVisitFormValues = z.infer<typeof ServiceVisitFormSchema>;

export const serviceVisitFormDefaultValues: ServiceVisitFormValues = {
    visitDate: "",
    resolutionDone: undefined,
    remarks: "",
    resolvedPhoto: [],
    signedPhoto: [],
};

export const serviceVisitAttachmentUrl = (value?: string | null): string =>
    value ? fileUploadService.getFileUrl(value) : "";
