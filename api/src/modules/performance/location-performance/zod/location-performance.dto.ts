import { z } from "zod";

export const locationPerformanceQuerySchema = z
    .object({
        heading: z.coerce.number().int().positive({ message: "A valid item heading must be selected" }).optional(),
        team: z.coerce.number().int().positive().optional(),
        area: z.string().optional(),
        location: z.coerce.number().int().positive().optional(),
        fromDate: z.string().date("Invalid from date"),
        toDate: z.string().date("Invalid to date"),
    })
    .refine(d => d.area || d.location, {
        message: "Both area and location cannot be null",
        path: ["area"],
    })
    .refine(d => new Date(d.fromDate) <= new Date(d.toDate), {
        message: "fromDate must be before or equal to toDate",
        path: ["fromDate"],
    });

export type LocationPerformanceQuery = z.infer<typeof locationPerformanceQuerySchema>;
