import { z } from "zod";

export const WoUpdateSchema = z.object({
    id: z.coerce.number(),
});

export type WoUpdateInput = z.infer<typeof WoUpdateSchema>;
