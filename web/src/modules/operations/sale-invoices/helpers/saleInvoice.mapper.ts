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
        billingEmail: values.billingEmail || undefined,
        billingPanNo: values.billingPanNo || undefined,
        billingMsmeNo: values.billingMsmeNo || undefined,
        billingCinNo: values.billingCinNo || undefined,
        billingAddressId: values.selectedBillingAddressId ? Number(values.selectedBillingAddressId) : null,
        shippingCustomerName: values.shippingCustomerName,
        shippingAddress: values.shippingAddress,
        shippingGst: values.shippingGst || undefined,
        shippingPanNo: values.shippingPanNo || undefined,
        shippingAddressId: values.selectedShippingAddressId ? Number(values.selectedShippingAddressId) : null,
        transporterId: values.transporterId ? Number(values.transporterId) : null,
        dispatchFromName: values.dispatchFromName || undefined,
        dispatchFromAddress: values.dispatchFromAddress || undefined,
        dispatchFromGst: values.dispatchFromGst || undefined,
        dispatchVehicleNo: values.dispatchVehicleNo || undefined,
        dispatchLrNo: values.dispatchLrNo || undefined,
        dispatchToName: values.dispatchToName || undefined,
        dispatchToAddress: values.dispatchToAddress || undefined,
        dispatchToGst: values.dispatchToGst || undefined,
        freight: Number(values.freight || 0),
        otherCharges: Number(values.otherCharges || 0),
        roundOff: Number(values.roundOff || 0),
        items: values.items
            .filter((item) => item.itemDescription && item.qty !== null && item.rate !== null && item.qty > 0)
            .map((item) => ({
                lineItemSrNo: item.lineItemSrNo,
                purchaseOrderProductId: item.purchaseOrderProductId,
                srNo: item.lineItemSrNo > 0 ? item.lineItemSrNo : undefined,
                itemDescription: item.itemDescription,
                qty: item.qty!,
                rate: item.rate!,
                gstRate: item.gstRate,
                unit: item.unit,
                hsnSac: item.hsnSac,
            })),
        remarks: values.remarks || undefined,
    };
}
