import { z } from 'zod';

export const HappyCallingStatusEnum = z.enum(['pending', 'done']);

export const CreateHappyCallingSchema = z.object({
    organization: z.string().max(255).nullish(),
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).nullish(),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    date: z.string().nullish(),
    status: HappyCallingStatusEnum.nullish(),
    nextFollowupDate: z.string().nullish(),
    broadcast: z.number().int().min(0).default(0),
});

export type CreateHappyCallingDto = z.infer<typeof CreateHappyCallingSchema>;

export const UpdateHappyCallingSchema = CreateHappyCallingSchema.partial();

export type UpdateHappyCallingDto = z.infer<typeof UpdateHappyCallingSchema>;