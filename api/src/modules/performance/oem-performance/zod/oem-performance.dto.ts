// zod/oem-performance.dto.ts

import { z } from "zod";

export const OemPerformanceQuerySchema = z.object({
    oemId: z.coerce.number(),
    fromDate: z.coerce.date(),
    toDate: z.coerce.date(),
});
export type OemPerformanceQueryDto = z.infer<typeof OemPerformanceQuerySchema>;
