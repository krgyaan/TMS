import { z } from "zod";

const ServiceReportAttachmentSchema = z.object({
    path: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
});

export const CreateServiceReportSchema = z.object({
    complaintId: z.number().int().positive(),
    serviceEngineerId: z.number().int().positive().optional().nullable(),
    remarks: z.string().min(1, "Remarks are required"),
    resolutionDone: z.enum(["0", "1"]).optional().nullable(),
    unsignedPhoto: z.array(ServiceReportAttachmentSchema).default([]),
    signedPhoto: z.array(ServiceReportAttachmentSchema).default([]),
    resolvedPhoto: z.array(ServiceReportAttachmentSchema).default([]),
    visitDate: z.string().datetime().optional().nullable(),
});

export const UpdateServiceReportSchema = CreateServiceReportSchema.partial();

export type CreateServiceReportDto = z.infer<typeof CreateServiceReportSchema>;
export type UpdateServiceReportDto = z.infer<typeof UpdateServiceReportSchema>;
