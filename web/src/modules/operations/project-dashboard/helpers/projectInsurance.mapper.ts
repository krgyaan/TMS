import { buildInsurancePayload } from "@/modules/insurance/helpers/insurance.mapper";
import type { ProjectInsuranceFormValues } from "./projectInsurance.schema";

export function mapProjectInsuranceFormToCreateDTO(
    values: ProjectInsuranceFormValues,
    projectId: number,
    projectName?: string,
) {
    const dto: Record<string, unknown> = {
        projectId,
        projectName: projectName || undefined,
        paymentMode: values.paymentMode,
        amount: values.amount!,
        paymentAgainst: "insurance",
        beneficiaryId: values.selectedBeneficiaryId ? Number(values.selectedBeneficiaryId) : undefined,
        billFiles: values.billFiles?.length ? values.billFiles : undefined,
        remark: values.remark || undefined,
    };

    if (values.paymentMode === "BANK_TRANSFER") {
        dto.partyName = values.partyName;
        dto.accountNumber = values.accountNumber;
        dto.bankName = values.bankName || undefined;
        dto.ifsc = values.ifsc;
    } else {
        dto.portalLink = values.portalLink || undefined;
    }

    const insurancePayload = buildInsurancePayload(values);
    if (insurancePayload) {
        dto.insurance = JSON.stringify(insurancePayload);
    }

    return dto;
}