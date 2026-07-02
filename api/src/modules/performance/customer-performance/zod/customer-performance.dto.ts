import { z } from "zod";

export const customerPerformanceQuerySchema = z
    .object({
        org: z.coerce.number().int().positive().optional(),
        teamId: z.coerce.number().int().positive().optional(),
        itemHeading: z.coerce.number().int().positive().optional(),
        fromDate: z.string().date("Invalid from date").optional(),
        toDate: z.string().date("Invalid to date").optional(),
    })
    .refine(d => !d.fromDate || !d.toDate || new Date(d.fromDate) <= new Date(d.toDate), { message: "fromDate must be before or equal to toDate", path: ["fromDate"] });

export type CustomerPerformanceQuery = z.infer<typeof customerPerformanceQuerySchema>;
