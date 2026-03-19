import { z } from "zod";

export const businessPerformanceQuerySchema = z
    .object({
        heading: z.coerce.number().int().positive({ message: "A valid item heading must be selected" }),
        fromDate: z.string().date("Invalid from date"),
        toDate: z.string().date("Invalid to date"),
    })
    .refine(d => new Date(d.fromDate) <= new Date(d.toDate), {
        message: "fromDate must be before or equal to toDate",
        path: ["fromDate"],
    });

export const itemHeadingsQuerySchema = z.object({});

export type BusinessPerformanceQuery = z.infer<typeof businessPerformanceQuerySchema>;
