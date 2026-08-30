import { z } from "zod";
import { insuranceFieldsSchema, validateInsuranceFields } from "@/modules/insurance/helpers/insurance.schema";

export const projectInsuranceFormSchema = z
    .object({
        raisePayment: z.boolean().default(true),
        paymentMode: z.enum(["BANK_TRANSFER", "PORTAL"]).default("BANK_TRANSFER"),
        selectedBeneficiaryId: z.string().default(""),
        partyName: z.string().default(""),
        accountNumber: z.string().default(""),
        bankName: z.string().default(""),
        ifsc: z.string().default(""),
        portalLink: z.string().default(""),
        amount: z.number().nullable().refine(v => v !== null && v >= 0, "Amount must be >= 0"),
        billFiles: z.array(z.string()).default([]),
        remark: z.string().default(""),
        ...insuranceFieldsSchema.shape,
    })
    .superRefine((data, ctx) => {
        if (data.raisePayment) {
            if (data.paymentMode === "BANK_TRANSFER") {
                if (!data.partyName.trim()) {
                    ctx.addIssue({ code: "custom", path: ["partyName"], message: "Party name is required" });
                }
                if (!data.accountNumber.trim()) {
                    ctx.addIssue({ code: "custom", path: ["accountNumber"], message: "Account number is required" });
                }
                if (!data.ifsc.trim()) {
                    ctx.addIssue({ code: "custom", path: ["ifsc"], message: "IFSC is required" });
                }
            } else {
                if (!data.portalLink.trim()) {
                    ctx.addIssue({ code: "custom", path: ["portalLink"], message: "Portal link is required" });
                }
            }
        }

        validateInsuranceFields(data, ctx, true);
    });

export type ProjectInsuranceFormValues = z.infer<typeof projectInsuranceFormSchema>;

export const projectInsuranceDefaultValues: ProjectInsuranceFormValues = {
    raisePayment: true,
    paymentMode: "BANK_TRANSFER",
    selectedBeneficiaryId: "",
    partyName: "",
    accountNumber: "",
    bankName: "",
    ifsc: "",
    portalLink: "",
    amount: null,
    billFiles: [],
    remark: "",
    insuranceType: null,
    policyNumber: null,
    insurerName: null,
    startDate: null,
    endDate: null,
    policyDocument: [],
    sumAssured: null,
    noOfManpower: null,
    manpowerNames: null,
    location: null,
    itemsCovered: null,
    lrCopy: [],
};