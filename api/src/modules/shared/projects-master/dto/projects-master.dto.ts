import { z } from "zod";

// Helper to handle empty arrays
const optionalFileArray = z
    .array(z.string())
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : undefined));

export const ProjectBaseSchema = z.object({
    teamName: z.string().max(255, "Team name is too long"),
    organisationId: z.number().int().nullable().optional(),
    itemId: z.number().int(),
    locationId: z.number().int().nullable().optional(),

    projectCode: z.string().max(255).nullable().optional(),
    projectName: z.string().max(255).nullable().optional(),

    poNo: z.string().max(255).nullable().optional(),
    poUpload: optionalFileArray,
    poDate: z.string().nullable().optional(),

    performanceProof: optionalFileArray,
    performanceDate: z.string().nullable().optional(),

    completionProof: optionalFileArray,
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
