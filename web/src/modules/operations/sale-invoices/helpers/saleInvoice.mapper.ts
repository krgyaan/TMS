import type { CreateSaleInvoiceDTO } from "./saleInvoice.types";
import type { SaleInvoiceFormValues } from "./saleInvoice.schema";

const GST_STATE_NAMES: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman and Diu",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
};

export function getGstStateName(gstin: string): string {
    return GST_STATE_NAMES[gstin.trim().slice(0, 2)] || "";
}

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
        projectManagerName: values.projectManagerName || undefined,
        projectManagerPhone: values.projectManagerPhone || undefined,
        projectManagerEmail: values.projectManagerEmail || undefined,
        billingCustomerName: values.billingCustomerName,
        billingAddress: values.billingAddress,
        billingGst: values.billingGst || undefined,
        billingStateName: values.billingStateName || undefined,
        billingPlaceOfSupply: values.billingPlaceOfSupply || undefined,
        billingContactPerson: values.billingContactPerson || undefined,
        billingPhone: values.billingPhone || undefined,
        billingEmail: values.billingEmail || undefined,
        billingPanNo: values.billingPanNo || undefined,
        billingMsmeNo: values.billingMsmeNo || undefined,
        billingCinNo: values.billingCinNo || undefined,
        billingAddressId: values.selectedBillingAddressId ? Number(values.selectedBillingAddressId) : null,
        shippingCustomerName: values.shippingCustomerName,
        shippingAddress: values.shippingAddress,
        shippingGst: values.shippingGst || undefined,
        shippingStateName: values.shippingStateName || undefined,
        shippingPlaceOfSupply: values.shippingPlaceOfSupply || undefined,
        shippingContactPerson: values.shippingContactPerson || undefined,
        shippingPhone: values.shippingPhone || undefined,
        shippingPanNo: values.shippingPanNo || undefined,
        shippingAddressId: values.selectedShippingAddressId ? Number(values.selectedShippingAddressId) : null,
        transporterId: values.transporterId ? Number(values.transporterId) : null,
        transportVia: values.transportVia || undefined,
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
