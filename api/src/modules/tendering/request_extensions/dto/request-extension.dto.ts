import { z } from 'zod';

export const CreateRequestExtensionSchema = z.object({
    tenderId: z.number(),
    days: z.number().int().positive(),
    reason: z.string().min(1),
    clients: z.array(z.object({
        org: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
    })).min(1, "At least one client is required"),

});

export type CreateRequestExtensionDto = z.infer<typeof CreateRequestExtensionSchema>;

export const UpdateRequestExtensionSchema = CreateRequestExtensionSchema.partial();

export type UpdateRequestExtensionDto = z.infer<typeof UpdateRequestExtensionSchema>;
