import { z } from 'zod';

export const PqrFormSchema = z.object({
    teamName: z.coerce.number().int().positive({ message: "Team Name is required" }),
    projectName: z.string().min(1, { message: "Project Name is required" }),
    value: z.coerce.number().nonnegative({ message: "Value is required" }),
    item: z.string().min(1, { message: "Item is required" }),
    poDate: z.string().min(1, { message: "PO date is required" }),
    uploadPo: z.string().nullable(),
    uploadSapGemPo: z.string().nullable(),
    sapGemPoDate: z.string().min(1, { message: "SAP/GEM PO date is required" }),
    uploadCompletion: z.string().nullable(),
    completionDate: z.string().min(1, { message: "Completion date is required" }),
    uploadPerformanceCertificate: z.string().nullable(),
    remarks: z.string().optional(),
});

export type PqrFormValues = z.infer<typeof PqrFormSchema>;
