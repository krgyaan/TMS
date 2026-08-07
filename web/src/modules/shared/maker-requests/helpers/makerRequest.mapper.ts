import type { CreateMakerRequestDTO } from "./makerRequest.types";
import type { MakerRequestFormValues } from "./makerRequest.schema";

export function mapMakerRequestFormToCreateDTO(
    values: MakerRequestFormValues,
): CreateMakerRequestDTO {
    const dto: CreateMakerRequestDTO = {
        paymentMode: values.paymentMode,
        amount: values.amount!,
        category: values.categoryId || undefined,
        beneficiaryId: values.selectedBeneficiaryId ? Number(values.selectedBeneficiaryId) : undefined,
        billFiles: values.billFiles?.length ? values.billFiles : undefined,
        uploadInvoice: values.uploadInvoice?.length ? values.uploadInvoice : undefined,
        uploadPI: values.uploadPI?.length ? values.uploadPI : undefined,
        remark: values.remark || undefined,
    };

    if (values.paymentMode === "BANK_TRANSFER") {
        dto.partyName = values.partyName || undefined;
        dto.accountNumber = values.accountNumber || undefined;
        dto.ifsc = values.ifsc || undefined;
    } else {
        dto.portalLink = values.portalLink || undefined;
    }

    return dto;
}
