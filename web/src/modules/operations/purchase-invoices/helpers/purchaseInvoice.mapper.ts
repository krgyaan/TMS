import type { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO } from "./purchaseInvoice.types";
import type { PurchaseInvoiceFormValues } from "./purchaseInvoice.schema";

export function formatDateForInput(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
}

export function mapPurchaseInvoiceFormToCreateDTO(
    values: PurchaseInvoiceFormValues,
    projectId: number,
    projectName?: string,
): CreatePurchaseInvoiceDTO {
    return {
        projectId,
        projectName: projectName || undefined,
        category: values.category,
        partyName: values.partyName,
        valuePreGst: values.valuePreGst!,
        gstAmount: values.gstAmount!,
        invoiceDate: values.invoiceDate,
        invoiceFile: values.invoiceFile?.length ? values.invoiceFile[0] : undefined,
    };
}

export function mapPurchaseInvoiceFormToUpdateDTO(
    values: PurchaseInvoiceFormValues,
): UpdatePurchaseInvoiceDTO {
    return {
        category: values.category,
        partyName: values.partyName,
        valuePreGst: values.valuePreGst!,
        gstAmount: values.gstAmount!,
        invoiceDate: values.invoiceDate,
        invoiceFile: values.invoiceFile?.length ? values.invoiceFile[0] : undefined,
    };
}
