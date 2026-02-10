import { z } from "zod";

export const MasterProjectFormSchema = z.object({
    teamId: z.coerce.number().int().positive({ message: "Team is required" }),
    organisationId: z.coerce.number().int().positive().nullable().optional(),
    itemId: z.coerce.number().int().positive({ message: "Item is required" }),
    locationId: z.coerce.number().int().positive().nullable().optional(),

    poNo: z.string().max(255).optional(),
    poDate: z.string().optional(),
    poDocument: z.string().optional(),

    performanceCertificate: z.string().optional(),
    performanceDate: z.string().optional(),

    completionDocument: z.string().optional(),
    completionDate: z.string().optional(),

    sapPoDate: z.string().optional(),
    sapPoNo: z.string().optional(),

    tenderId: z.coerce.number().int().positive().nullable().optional(),
    enquiryId: z.coerce.number().int().positive().nullable().optional(),
});

export type MasterProjectFormValues = z.infer<typeof MasterProjectFormSchema>;
