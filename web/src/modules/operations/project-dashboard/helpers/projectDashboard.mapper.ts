import type { CreatePurchaseOrderDTO, UpdatePurchaseOrderDTO } from "./projectDashboard.types";
import type { PurchaseOrderFormValues } from "./purchaseOrder.schema";

export function formatDateForInput(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
}

export function mapFormToCreateDTO(
    values: PurchaseOrderFormValues,
    tenderId: number,
    projectId?: number,
    projectName?: string,
): CreatePurchaseOrderDTO {
    return {
        tenderId,
        projectId,
        projectName: projectName || undefined,
        poDate: values.poDate,
        sellerId: values.sellerId ? Number(values.sellerId) : undefined,
        shipToPartyId: values.partyId ? Number(values.partyId) : undefined,
        sellerName: values.sellerName,
        sellerEmail: values.sellerEmail || undefined,
        sellerAddress: values.sellerAddress || undefined,
        sellerGstNo: values.sellerGstNo || undefined,
        sellerPanNo: values.sellerPanNo || undefined,
        sellerMsmeNo: values.sellerMsmeNo || undefined,
        sellerCinNo: values.sellerCinNo || undefined,
        contactPersonName: values.contactPersonName || undefined,
        contactPersonPhone: values.contactPersonPhone || undefined,
        contactPersonEmail: values.contactPersonEmail || undefined,
        certRecipients: values.selectedCertRecipients.length ? values.selectedCertRecipients.map(Number) : undefined,
        shipToName: values.shipToName,
        shippingAddress: values.shippingAddress,
        shipToGst: values.shipToGst || undefined,
        shipToPan: values.shipToPan || undefined,
        products: values.products
            .filter(p => p.description && p.qty !== null && p.rate !== null && p.qty > 0)
            .map(p => ({
                description: p.description,
                hsnSac: p.hsnSac,
                qty: p.qty!,
                rate: p.rate!,
                gstRate: p.gstRate,
            })),
        quotationNo: values.quotationNo || undefined,
        quotationDate: values.quotationDate || undefined,
        termsAndConditions: values.termsAndConditions?.length ? values.termsAndConditions : undefined,
        technicalSpecsAttachments: values.technicalSpecsAttachments?.length ? JSON.stringify(values.technicalSpecsAttachments) : undefined,
        accessoriesPackagingListAttachments: values.accessoriesPackagingListAttachments?.length ? JSON.stringify(values.accessoriesPackagingListAttachments) : undefined,
        remarks: values.remarks || undefined,
    };
}

export function mapFormToUpdateDTO(
    values: PurchaseOrderFormValues,
): UpdatePurchaseOrderDTO {
    return {
        poDate: values.poDate,
        sellerId: values.sellerId ? Number(values.sellerId) : undefined,
        shipToPartyId: values.partyId ? Number(values.partyId) : undefined,
        sellerName: values.sellerName,
        sellerEmail: values.sellerEmail || undefined,
        sellerAddress: values.sellerAddress || undefined,
        sellerGstNo: values.sellerGstNo || undefined,
        sellerPanNo: values.sellerPanNo || undefined,
        sellerMsmeNo: values.sellerMsmeNo || undefined,
        sellerCinNo: values.sellerCinNo || undefined,
        contactPersonName: values.contactPersonName || undefined,
        contactPersonPhone: values.contactPersonPhone || undefined,
        contactPersonEmail: values.contactPersonEmail || undefined,
        certRecipients: values.selectedCertRecipients.length ? values.selectedCertRecipients.map(Number) : undefined,
        shipToName: values.shipToName,
        shippingAddress: values.shippingAddress,
        shipToGst: values.shipToGst || undefined,
        shipToPan: values.shipToPan || undefined,
        products: values.products
            .filter(p => p.description && p.qty !== null && p.rate !== null && p.qty > 0)
            .map(p => ({
                description: p.description,
                hsnSac: p.hsnSac,
                qty: p.qty!,
                rate: p.rate!,
                gstRate: p.gstRate,
            })),
        quotationNo: values.quotationNo || undefined,
        quotationDate: values.quotationDate || undefined,
        termsAndConditions: values.termsAndConditions?.length ? values.termsAndConditions : undefined,
        technicalSpecsAttachments: values.technicalSpecsAttachments?.length ? JSON.stringify(values.technicalSpecsAttachments) : undefined,
        accessoriesPackagingListAttachments: values.accessoriesPackagingListAttachments?.length ? JSON.stringify(values.accessoriesPackagingListAttachments) : undefined,
        remarks: values.remarks || undefined,
    };
}

export function calculateTotals(products: Array<{ qty: number | null; rate: number | null; gstRate: number }>) {
    let subtotal = 0;
    let totalGst = 0;

    products.forEach(p => {
        const qty = p.qty ?? 0;
        const rate = p.rate ?? 0;
        const lineTotal = qty * rate;
        const gst = (lineTotal * p.gstRate) / 100;
        subtotal += lineTotal;
        totalGst += gst;
    });

    return { subtotal, totalGst, grandTotal: subtotal + totalGst };
}

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatINR = (amount: number) => {
    return amount.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};
