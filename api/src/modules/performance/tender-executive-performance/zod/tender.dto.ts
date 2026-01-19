import { z } from "zod";

export const TenderListQuerySchema = z.object({
    userId: z.coerce.number(),
    fromDate: z.string(),
    toDate: z.string(),
    outcome: z.enum(["resultAwaited", "won", "lost", "missed", "notBid"]).optional(),
});

export type TenderListQuery = z.infer<typeof TenderListQuerySchema>;
