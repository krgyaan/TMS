import { z } from "zod";

export const AddProjectClosureDocumentSchema = z.object({
    documentName: z.string().min(1, "Document name is required"),
    files: z.array(z.string().min(1)).min(1, "At least one file is required"),
});

export type AddProjectClosureDocumentDto = z.infer<typeof AddProjectClosureDocumentSchema>;
