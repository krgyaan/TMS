import { z } from "zod";

export const ProjectMasterFormSchema = z.object({
    teamName: z.coerce.string().min(1, { message: "Team is required" }),
    organisationId: z.coerce.number().int().positive({ message: "Organization is required" }),
    itemId: z.coerce.number().int().positive({ message: "Item is required" }),
    locationId: z.coerce.number().int().positive({ message: "Location is required" }),

    poNo: z.string().min(1, { message: "PO number is required" }).max(255),
    poDate: z.string().min(1, { message: "PO date is required" }),
    poDocument: z.array(z.string()).default([]),

    projectCode: z.string().min(1, { message: "Project code is required" }).max(255),
    projectName: z.string().min(1, { message: "Project name is required" }).max(255),

    performanceCertificate: z.array(z.string()).default([]),
    performanceDate: z.string().optional(),

    completionDocument: z.array(z.string()).default([]),
    completionDate: z.string().optional(),

    sapPoDate: z.string().optional(),
    sapPoNo: z.string().optional(),

    tenderId: z.coerce.number().int().positive().nullable().optional(),
    enquiryId: z.coerce.number().int().positive().nullable().optional(),
});

export type ProjectMasterFormValues = z.infer<typeof ProjectMasterFormSchema>;
