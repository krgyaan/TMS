import { z } from 'zod';

/**
 * Schema for RFQ form
 */
export const RfqFormSchema = z.object({
    dueDate: z.date({ message: "Due date is required" }),

    scopeOfWorkPaths: z.array(z.string()).default([]),
    techSpecsPaths: z.array(z.string()).default([]),
    detailedBoqPaths: z.array(z.string()).default([]),
    mafFormatPaths: z.array(z.string()).default([]),
    miiFormatPaths: z.array(z.string()).default([]),

    docList: z.string().optional(),
    items: z.array(z.object({
        requirement: z.string().min(1, "Requirement is required"),
        unit: z.string().min(1, "Unit is required"),
        qty: z.number().min(0.01, "Quantity must be greater than 0"),
    })).min(1, "At least one requirement is needed"),

    vendorRows: z.array(z.object({
        orgId: z.string().min(1, "Organization is required"),
        personIds: z.array(z.string()).min(1, "Select at least one contact person"),
    })).optional(),
}).refine(
    (data) => {
        // Calculate total file count
        const totalFiles =
            data.scopeOfWorkPaths.length +
            data.techSpecsPaths.length +
            data.detailedBoqPaths.length +
            data.mafFormatPaths.length +
            data.miiFormatPaths.length;

        // Max 15 files total (3 per field × 5 fields)
        return totalFiles <= 15;
    },
    {
        message: "Maximum 15 files total allowed (3 per field)",
        path: ["scopeOfWorkPaths"],
    }
);

export type RfqFormValues = z.infer<typeof RfqFormSchema>;
