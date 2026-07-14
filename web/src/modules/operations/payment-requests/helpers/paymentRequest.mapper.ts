import type { CreatePaymentRequestDTO, UpdatePaymentRequestDTO } from "./paymentRequest.types";
import type { PaymentRequestFormValues } from "./paymentRequest.schema";

export function mapPaymentRequestFormToCreateDTO(
    values: PaymentRequestFormValues,
    projectId: number,
    projectName?: string,
): CreatePaymentRequestDTO {
    return {
        projectId,
        projectName: projectName || undefined,
        partyName: values.partyName,
        accountNumber: values.accountNumber,
        bankName: values.bankName || undefined,
        ifsc: values.ifsc,
        amount: values.amount!,
        paymentAgainst: values.paymentAgainst,
        purchaseOrderId: values.selectedPoId ? Number(values.selectedPoId) : undefined,
        vendorWorkOrderId: values.selectedVwoId ? Number(values.selectedVwoId) : undefined,
        poFile: values.poFile?.length ? values.poFile[0] : undefined,
        remark: values.remark || undefined,
    };
}

export function mapPaymentRequestFormToUpdateDTO(
    values: PaymentRequestFormValues,
): UpdatePaymentRequestDTO {
    return {
        partyName: values.partyName,
        accountNumber: values.accountNumber,
        bankName: values.bankName || undefined,
        ifsc: values.ifsc,
        amount: values.amount!,
        paymentAgainst: values.paymentAgainst,
        purchaseOrderId: values.selectedPoId ? Number(values.selectedPoId) : undefined,
        vendorWorkOrderId: values.selectedVwoId ? Number(values.selectedVwoId) : undefined,
        poFile: values.poFile?.length ? values.poFile[0] : undefined,
        remark: values.remark || undefined,
    };
}
