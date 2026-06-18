import { z } from 'zod';

export const CreateMomRemarkSchema = z.object({
    instrumentId: z.number().optional().nullable(),
    remark: z.string().min(1, 'Remark is required'),
});

export const MomRemarkResponse = z.object({
    id: z.number(),
    requestId: z.number(),
    instrumentId: z.number().nullable(),
    remark: z.string(),
    addedBy: z.number(),
    addedByName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
});

export type CreateMomRemarkDto = z.infer<typeof CreateMomRemarkSchema>;
export type MomRemarkResponseType = z.infer<typeof MomRemarkResponse>;
