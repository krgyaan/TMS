import { z } from 'zod';
import { optionalTextField, textField } from '@/utils/zod-schema-generator';

export const CreatePqrSchema = z.object({
    teamName: z.coerce.number().int().positive('Team Name is required'),
    projectName: textField(255).min(1, 'Project Name is required'),
    value: z.coerce.number().nonnegative('Value is required'),
    item: textField(255).min(1, 'Item is required'),
    poDate: z.string().min(1, 'PO date is required'),
    uploadPo: optionalTextField(255),
    sapGemPoDate: z.string().min(1, 'SAP/GEM PO date is required'),
    uploadSapGemPo: optionalTextField(255),
    completionDate: z.string().min(1, 'Completion date is required'),
    uploadCompletion: optionalTextField(255),
    uploadPerformanceCertificate: optionalTextField(255),
    remarks: optionalTextField(255),
});

export type CreatePqrDto = z.infer<typeof CreatePqrSchema>;

export const UpdatePqrSchema = CreatePqrSchema.partial();

export type UpdatePqrDto = z.infer<typeof UpdatePqrSchema>;
