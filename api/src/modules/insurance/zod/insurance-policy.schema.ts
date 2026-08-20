import { z } from "zod";

export const INSURANCE_TYPES = ["WC", "Storage", "Open Marine", "Transit", "CAR", "EAR"] as const;

export const insurancePolicyBaseSchema = z.object({
    insuranceType: z.enum(INSURANCE_TYPES),
    policyNumber: z.string().max(255).optional().nullable(),
    insurerName: z.string().max(255).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    policyDocument: z.array(z.string()).min(1, "Policy document is required"),
    sumAssured: z.coerce.number().positive("Value / Sum Assured is required"),
    noOfManpower: z.coerce.number().int().optional().nullable(),
    manpowerNames: z.string().optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    itemsCovered: z.string().optional().nullable(),
    lrCopy: z.array(z.string()).optional().nullable(),
});

const endDateAfterStart = (data: { startDate?: Date; endDate?: Date }, ctx: z.RefinementCtx) => {
    if (data.startDate && data.endDate && data.startDate >= data.endDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "End Date must be after Start Date",
            path: ["endDate"],
        });
    }
};

export const insurancePolicySchema = insurancePolicyBaseSchema.superRefine(endDateAfterStart);

export const createInsurancePolicySchema = insurancePolicyBaseSchema
    .extend({
        imprestId: z.coerce.number().int().optional().nullable(),
        makerRequestId: z.coerce.number().int().optional().nullable(),
        projectId: z.coerce.number().int().optional().nullable(),
        paymentRequestId: z.coerce.number().int().optional().nullable(),
    })
    .superRefine(endDateAfterStart);

export const updateInsurancePolicySchema = insurancePolicyBaseSchema.partial().superRefine(endDateAfterStart);

export const insurancePayloadSchema = z
    .string()
    .transform((raw, ctx) => {
        try {
            return JSON.parse(raw) as unknown;
        } catch {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "insurance must be a valid JSON string",
            });
            return z.NEVER;
        }
    })
    .pipe(insurancePolicySchema);

export type CreateInsurancePolicyDto = z.infer<typeof createInsurancePolicySchema>;
export type UpdateInsurancePolicyDto = z.infer<typeof updateInsurancePolicySchema>;
export type InsurancePayload = z.infer<typeof insurancePayloadSchema>;
