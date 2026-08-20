import { z } from 'zod';

export const CreateBroadcastSchema = z.object({
    name: z.string().min(1, 'Broadcast name is required').max(255),
});

export type CreateBroadcastDto = z.infer<typeof CreateBroadcastSchema>;

export const UpdateBroadcastSchema = CreateBroadcastSchema.partial();

export type UpdateBroadcastDto = z.infer<typeof UpdateBroadcastSchema>;