import { z } from "zod";

export const locationPerformanceQuerySchema = z
    .object({
        heading: z.coerce.number().int().positive({ message: "A valid item heading must be selected" }).optional(),
        team: z.coerce.number().int().positive().optional(),
        location: z.coerce.number().int().positive().optional(),
        year: z
            .string()
            .regex(/^\d{4}-\d{2}$/, "Invalid financial year")
            .optional(),
    })
    .refine(d => d.location, {
        message: "Location must be selected",
        path: ["location"],
    })
    .refine(d => d.year, {
        message: "Financial year must be selected",
        path: ["year"],
    });

export type LocationPerformanceQuery = z.infer<typeof locationPerformanceQuerySchema>;
