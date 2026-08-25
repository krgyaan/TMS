import { z } from 'zod';

export const CreateHappyCallingSchema = z.object({
    cDId: z.number().int().nullish(),
    organization: z.string().max(255).nullish(),
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).nullish(),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    status: z.string().max(50).nullish(),
    broadcast: z.number().int().min(0).default(0),
    details: z.string().max(5000).nullish(),
});

export type CreateHappyCallingDto = z.infer<typeof CreateHappyCallingSchema>;

export const UpdateHappyCallingSchema = CreateHappyCallingSchema.partial();

export type UpdateHappyCallingDto = z.infer<typeof UpdateHappyCallingSchema>;