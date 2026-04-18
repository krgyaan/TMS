import { z } from "zod";

export const oemPerformanceQuerySchema = z
    .object({
        oem: z.coerce.number().int().positive({ message: "A valid OEM must be selected" }),
        fromDate: z.string().date("Invalid from date"),
        toDate: z.string().date("Invalid to date"),
    })
    .refine(data => new Date(data.fromDate) <= new Date(data.toDate), {
        message: "fromDate must be before or equal to toDate",
        path: ["fromDate"],
    });

export type OemPerformanceQuery = z.infer<typeof oemPerformanceQuerySchema>;
