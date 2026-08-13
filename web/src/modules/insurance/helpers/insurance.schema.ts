import * as z from "zod";
import { INSURANCE_TYPES } from "./insurance.types";

export const insuranceFieldsSchema = z.object({
    insuranceType: z.string().optional().nullable(),
    policyNumber: z.string().optional().nullable(),
    insurerName: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    policyDocument: z.array(z.string()).default([]),
    sumAssured: z.preprocess(
        v => {
            if (v === "" || v === undefined || v === null) return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
        },
        z.number().optional().nullable()
    ),
    noOfManpower: z.preprocess(
        v => {
            if (v === "" || v === undefined || v === null) return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
        },
        z.number().int().optional().nullable()
    ),
    manpowerNames: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    itemsCovered: z.string().optional().nullable(),
    lrCopy: z.array(z.string()).default([]),
});

export type InsuranceFieldsValues = z.infer<typeof insuranceFieldsSchema>;

export function validateInsuranceFields(
    data: InsuranceFieldsValues,
    ctx: z.RefinementCtx,
    isInsurance: boolean
) {
    if (!isInsurance) return;

    if (!data.insuranceType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Insurance Type is required", path: ["insuranceType"] });
    }

    if (!data.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start Date is required", path: ["startDate"] });
    }

    if (!data.endDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End Date is required", path: ["endDate"] });
    }

    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End Date must be after Start Date", path: ["endDate"] });
    }

    if (!data.policyDocument || data.policyDocument.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Policy document is required", path: ["policyDocument"] });
    }

    if (!data.sumAssured || data.sumAssured <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Value / Sum Assured is required", path: ["sumAssured"] });
    }
}

export const INSURANCE_TYPE_OPTIONS = INSURANCE_TYPES.map(t => ({ id: t, name: t }));