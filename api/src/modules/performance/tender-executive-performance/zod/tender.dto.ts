import { z } from "zod";
import { TENDER_KPI_BUCKETS } from "./tender-buckets.type";

export const TenderListQuerySchema = z.object({
    userId: z.coerce.number(),
    fromDate: z.string(),
    toDate: z.string(),
    kpi: z.enum(TENDER_KPI_BUCKETS).optional(),
});

export type TenderListQuery = z.infer<typeof TenderListQuerySchema>;
