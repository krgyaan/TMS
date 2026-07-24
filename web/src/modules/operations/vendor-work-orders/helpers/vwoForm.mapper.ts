import type { CreateVendorWorkOrderDTO, UpdateVendorWorkOrderDTO } from "./vwoForm.types";
import type { VendorWorkOrderFormValues } from "./vwoForm.schema";

export function formatDateForInput(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
}

export function mapVwoFormToCreateDTO(
    values: VendorWorkOrderFormValues,
    tenderId: number,
    projectId?: number,
    projectName?: string,
): CreateVendorWorkOrderDTO {
    return {
        tenderId,
        projectId,
        projectName: projectName || undefined,
        woDate: values.woDate,
        category: values.category || undefined,
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
                qty: p.qty!,
                rate: p.rate!,
                gstRate: p.gstRate,
            })),
        termsAndConditions: values.termsAndConditions?.length ? values.termsAndConditions : undefined,
        scopeOfWork: values.scopeOfWork?.length ? JSON.stringify(values.scopeOfWork) : undefined,
        accessoriesPackagingListAttachments: values.accessoriesPackagingListAttachments?.length ? JSON.stringify(values.accessoriesPackagingListAttachments) : undefined,
        remarks: values.remarks || undefined,
    };
}

export function mapVwoFormToUpdateDTO(
    values: VendorWorkOrderFormValues,
): UpdateVendorWorkOrderDTO {
    return {
        woDate: values.woDate,
        category: values.category || undefined,
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
                qty: p.qty!,
                rate: p.rate!,
                gstRate: p.gstRate,
            })),
        termsAndConditions: values.termsAndConditions?.length ? values.termsAndConditions : undefined,
        scopeOfWork: values.scopeOfWork?.length ? JSON.stringify(values.scopeOfWork) : undefined,
        accessoriesPackagingListAttachments: values.accessoriesPackagingListAttachments?.length ? JSON.stringify(values.accessoriesPackagingListAttachments) : undefined,
        remarks: values.remarks || undefined,
    };
}
