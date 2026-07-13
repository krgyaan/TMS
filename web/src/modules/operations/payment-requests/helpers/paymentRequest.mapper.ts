import type { CreatePaymentRequestDTO, UpdatePaymentRequestDTO } from "./paymentRequest.types";
import type { PaymentRequestFormValues } from "./paymentRequest.schema";

function parseRefId(refId: string): { purchaseOrderId?: number; vendorWorkOrderId?: number } {
    if (!refId) return {};
    const [type, idStr] = refId.split(":");
    const id = Number(idStr);
    if (!id) return {};
    if (type === "po") return { purchaseOrderId: id };
    if (type === "vwo") return { vendorWorkOrderId: id };
    return {};
}

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
        ...parseRefId(values.selectedRefId),
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
        ...parseRefId(values.selectedRefId),
        poFile: values.poFile?.length ? values.poFile[0] : undefined,
        remark: values.remark || undefined,
    };
}
