import type { InsuranceFieldsValues } from "./insurance.schema";
import type { InsurancePayload } from "./insurance.types";

export function buildInsurancePayload(values: InsuranceFieldsValues): InsurancePayload | null {
    if (!values.insuranceType) {
        return null;
    }

    return {
        insuranceType: values.insuranceType,
        policyNumber: values.policyNumber || null,
        insurerName: values.insurerName || null,
        startDate: values.startDate || "",
        endDate: values.endDate || "",
        policyDocument: values.policyDocument ?? [],
        sumAssured: values.sumAssured ?? 0,
        noOfManpower: values.noOfManpower ?? null,
        manpowerNames: values.manpowerNames || null,
        location: values.location || null,
        itemsCovered: values.itemsCovered || null,
        lrCopy: values.lrCopy && values.lrCopy.length > 0 ? values.lrCopy : null,
    };
}