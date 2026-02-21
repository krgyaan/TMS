import { z } from 'zod';

export const PqrFormSchema = z.object({
    teamName: z.coerce.number().int().positive({ message: "Team Name is required" }),
    projectName: z.string().min(1, { message: "Project Name is required" }),
    value: z.coerce.number().nonnegative({ message: "Value is required" }),
    item: z.string().min(1, { message: "Item is required" }),
    poDate: z.string().min(1, { message: "PO date is required" }),
    uploadPo: z.array(z.string()).default([]),
    uploadSapGemPo: z.array(z.string()).default([]),
    sapGemPoDate: z.string().min(1, { message: "SAP/GEM PO date is required" }),
    uploadCompletion: z.array(z.string()).default([]),
    completionDate: z.string().min(1, { message: "Completion date is required" }),
    uploadPerformanceCertificate: z.array(z.string()).default([]),
    remarks: z.string().optional(),
});

export type PqrFormValues = z.infer<typeof PqrFormSchema>;
