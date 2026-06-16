import { z } from 'zod';

export const CreateClientDirectorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    organization: z.string().max(255).nullish(),
});

export type CreateClientDirectoryDto = z.infer<typeof CreateClientDirectorySchema>;

export const UpdateClientDirectorySchema = CreateClientDirectorySchema.partial();

export type UpdateClientDirectoryDto = z.infer<typeof UpdateClientDirectorySchema>;
