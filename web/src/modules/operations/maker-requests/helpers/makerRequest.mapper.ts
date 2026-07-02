import type { CreateMakerRequestDTO } from "./makerRequest.types";
import type { MakerRequestFormValues } from "./makerRequest.schema";

export function mapMakerRequestFormToCreateDTO(
    values: MakerRequestFormValues,
): CreateMakerRequestDTO {
    return {
        partyName: values.partyName,
        accountNumber: values.accountNumber,
        bankName: values.bankName || undefined,
        ifsc: values.ifsc,
        amount: values.amount!,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        billFiles: values.billFiles?.length ? values.billFiles : undefined,
        remark: values.remark || undefined,
    };
}
