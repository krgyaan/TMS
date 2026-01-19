import { z } from "zod";

export const PerformanceQuerySchema = z.object({
    userId: z.coerce.number().int().positive(),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
});

export type PerformanceQueryDto = z.infer<typeof PerformanceQuerySchema>;
