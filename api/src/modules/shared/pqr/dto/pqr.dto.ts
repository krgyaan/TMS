import { z } from 'zod';
import { optionalTextField, textField } from '@/utils/zod-schema-generator';

// Helper to handle null/undefined/empty strings for optional dates
const optionalDateString = z
    .string()
    .nullish()  // Accepts string | null | undefined
    .transform((val) => (val && val.trim() !== '' ? val : undefined));

// Helper to handle empty arrays
const optionalFileArray = z
    .array(z.string())
    .nullish()
    .transform((val) => (val && val.length > 0 ? val : undefined));

export const CreatePqrSchema = z.object({
    teamId: z.coerce.number().int().positive('Team Name is required'),
    projectName: textField(255).min(1, 'Project Name is required'),
    value: z.coerce.number().nonnegative('Value is required'),
    item: textField(255).min(1, 'Item is required'),
    poDate: z.string().min(1, 'PO date is required'),
    uploadPo: optionalFileArray,
    uploadSapGemPo: optionalFileArray,
    uploadCompletion: optionalFileArray,
    performanceCertificate: optionalFileArray,
    sapGemPoDate: optionalDateString,
    completionDate: optionalDateString,

    remarks: optionalTextField(255),
});

export type CreatePqrDto = z.infer<typeof CreatePqrSchema>;

export const UpdatePqrSchema = CreatePqrSchema.partial();

export type UpdatePqrDto = z.infer<typeof UpdatePqrSchema>;
