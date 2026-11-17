import { z } from "zod";

export const locationPerformanceQuerySchema = z
    .object({
        heading: z.coerce.number().int().positive().optional(),
        team: z.coerce.number().int().positive().optional(),
        location: z.coerce.number().int().positive().optional(),
        state: z.string().min(1).optional(),
        region: z.string().min(1).optional(),
        fromDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (yyyy-mm-dd)")
            .optional(),
        toDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (yyyy-mm-dd)")
            .optional(),
        year: z
            .string()
            .regex(/^\d{4}-\d{2}$/, "Invalid financial year")
            .optional(),
    })
    .refine(d => d.state, {
        message: "State must be selected",
        path: ["state"],
    })
    .refine(d => d.fromDate || d.year, {
        message: "Date range must be selected",
        path: ["fromDate"],
    });

export type LocationPerformanceQuery = z.infer<typeof locationPerformanceQuerySchema>;
