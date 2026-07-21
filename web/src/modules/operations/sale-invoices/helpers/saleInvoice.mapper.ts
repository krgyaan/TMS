import type { CreateSaleInvoiceDTO } from "./saleInvoice.types";
import type { SaleInvoiceFormValues } from "./saleInvoice.schema";

export function formatDateForInput(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
}

export const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export function mapSaleInvoiceFormToCreateDTO(
    values: SaleInvoiceFormValues,
    projectId: number,
    woDetailId?: number,
): CreateSaleInvoiceDTO {
    return {
        projectId,
        woDetailId,
        invoiceDate: values.invoiceDate,
        billingCustomerName: values.billingCustomerName,
        billingAddress: values.billingAddress,
        billingGst: values.billingGst || undefined,
        shippingCustomerName: values.shippingCustomerName,
        shippingAddress: values.shippingAddress,
        shippingGst: values.shippingGst || undefined,
        items: values.items
            .filter(item => item.itemDescription && item.qty !== null && item.rate !== null && item.qty > 0)
            .map(item => ({
                srNo: item.srNo,
                itemDescription: item.itemDescription,
                qty: item.qty!,
                rate: item.rate!,
                gstRate: item.gstRate,
            })),
        remarks: values.remarks || undefined,
    };
}
