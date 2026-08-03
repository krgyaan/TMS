import type { CreatePaymentRequestDTO, UpdatePaymentRequestDTO } from "./paymentRequest.types";
import type { PaymentRequestFormValues } from "./paymentRequest.schema";

export function mapPaymentRequestFormToCreateDTO(
    values: PaymentRequestFormValues,
    projectId: number,
    projectName?: string,
): CreatePaymentRequestDTO {
    const dto: CreatePaymentRequestDTO = {
        projectId,
        projectName: projectName || undefined,
        paymentMode: values.paymentMode,
        amount: values.amount!,
        paymentAgainst: values.paymentAgainst,
        purchaseOrderId: values.selectedPoId ? Number(values.selectedPoId) : undefined,
        vendorWorkOrderId: values.selectedVwoId ? Number(values.selectedVwoId) : undefined,
        poFile: values.poFile?.length ? values.poFile[0] : undefined,
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

    return dto;
}

export function mapPaymentRequestFormToUpdateDTO(
    values: PaymentRequestFormValues,
): UpdatePaymentRequestDTO {
    const dto: UpdatePaymentRequestDTO = {
        paymentMode: values.paymentMode,
        amount: values.amount!,
        paymentAgainst: values.paymentAgainst,
        purchaseOrderId: values.selectedPoId ? Number(values.selectedPoId) : undefined,
        vendorWorkOrderId: values.selectedVwoId ? Number(values.selectedVwoId) : undefined,
        poFile: values.poFile?.length ? values.poFile[0] : undefined,
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

    return dto;
}
