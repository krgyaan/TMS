import { z } from 'zod';

export const GiftingTierEnum = z.enum(['T0', 'T1', 'T2', 'T3', 'T4']);
export type GiftingTier = z.infer<typeof GiftingTierEnum>;

export const CreateClientDirectorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    designation: z.string().max(255).nullish(),
    address: z
        .object({
            personal: z.string().max(500).nullish(),
            official: z.string().max(500).nullish(),
        })
        .nullish(),
    email: z.string().email().max(255).nullish(),
    phone: z.string().max(20).nullish(),
    organization: z.string().max(255).nullish(),
    giftingTier: GiftingTierEnum.nullish(),
    remarks: z.array(z.string().min(1).max(1000)).max(100).nullish(),
});

export type CreateClientDirectoryDto = z.infer<typeof CreateClientDirectorySchema>;

export const UpdateClientDirectorySchema = CreateClientDirectorySchema.partial();

export type UpdateClientDirectoryDto = z.infer<typeof UpdateClientDirectorySchema>;
