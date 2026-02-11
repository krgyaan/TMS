import { z } from "zod";

export const ProjectBaseSchema = z.object({
    teamName: z.string().max(255, "Team name is too long"),
    organisationId: z.number().int().nullable().optional(),
    itemId: z.number().int(),
    locationId: z.number().int().nullable().optional(),

    poNo: z.string().max(255).nullable().optional(),
    poDocument: z.string().max(255).nullable().optional(),
    poDate: z.string().nullable().optional(),

    performanceCertificate: z.string().max(2000).nullable().optional(),
    performanceDate: z.string().nullable().optional(),

    completionDocument: z.string().max(2000).nullable().optional(),
    completionDate: z.string().nullable().optional(),

    sapPoDate: z.string().nullable().optional(),
    sapPoNo: z.string().max(255).nullable().optional(),

    tenderId: z.number().int().nullable().optional(),
    enquiryId: z.number().int().nullable().optional(),
});

export const CreateProjectSchema = ProjectBaseSchema;

export const UpdateProjectSchema = ProjectBaseSchema.partial();

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;

export type ListProjectsFilters = {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    teamName?: string;
    organisationId?: number;
    itemId?: number;
    locationId?: number;
    fromDate?: string;
    toDate?: string;
};
