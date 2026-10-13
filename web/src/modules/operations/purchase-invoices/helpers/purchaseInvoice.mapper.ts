import type { CreatePurchaseInvoiceDTO, ExtraChargePayload, InvoiceItemPayload, UpdatePurchaseInvoiceDTO } from "./purchaseInvoice.types";
import type { PurchaseInvoiceFormValues } from "./purchaseInvoice.schema";

export function formatDateForInput(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toISOString().split("T")[0];
}

export function itemsToPayload(items: PurchaseInvoiceFormValues["items"]): InvoiceItemPayload[] {
    return items
        .filter(i => i.description.trim() && i.qty != null && i.rate != null)
        .map(i => ({
            description: i.description.trim(),
            hsnSac: i.hsnSac?.trim() || undefined,
            qty: Number(i.qty),
            unit: i.unit?.trim().toUpperCase() || undefined,
            rate: Number(i.rate),
            gstRate: Number(i.gstRate ?? 0),
        }));
}

export function chargesToPayload(charges: PurchaseInvoiceFormValues["extraCharges"]): ExtraChargePayload[] {
    return charges
        .filter(c => c.label.trim() && c.amount != null)
        .map(c => ({
            label: c.label.trim(),
            amount: Number(c.amount),
            gstRate: Number(c.gstRate ?? 0),
        }));
}

export function snapshotFromProducts(products: any[]): InvoiceItemPayload[] {
    return products
        .filter((p: any) => p.description)
        .map((p: any) => ({
            description: String(p.description ?? "").trim(),
            hsnSac: p.hsnSac ? String(p.hsnSac).trim() : undefined,
            qty: Number(p.qty ?? 0),
            unit: String(p.unit ?? "NOS")
                .trim()
                .toUpperCase(),
            rate: Number(p.rate ?? 0),
            gstRate: Number(p.gstRate ?? 0),
        }));
}

export function snapshotFromCharges(charges: any[]): ExtraChargePayload[] {
    return (charges ?? [])
        .filter((c: any) => c.label)
        .map((c: any) => ({
            label: String(c.label ?? "").trim(),
            amount: Number(c.taxableAmount ?? c.amount ?? 0),
            gstRate: Number(c.gstRate ?? 0),
        }));
}

export function calculateInvoiceTotals(values: PurchaseInvoiceFormValues) {
    const items = itemsToPayload(values.items);
    const charges = chargesToPayload(values.extraCharges);

    let itemsTaxable = 0;
    let itemsGst = 0;
    for (const item of items) {
        const taxable = item.qty * item.rate;
        const gst = (taxable * item.gstRate) / 100;
        itemsTaxable += taxable;
        itemsGst += gst;
    }

    let chargesTaxable = 0;
    let chargesGst = 0;
    for (const charge of charges) {
        const gst = (charge.amount * charge.gstRate) / 100;
        chargesTaxable += charge.amount;
        chargesGst += gst;
    }

    return {
        valuePreGst: itemsTaxable + chargesTaxable,
        gstAmount: itemsGst + chargesGst,
        grandTotal: itemsTaxable + chargesTaxable + itemsGst + chargesGst,
        itemsValuePreGst: itemsTaxable,
        itemsGstAmount: itemsGst,
        chargesValuePreGst: chargesTaxable,
        chargesGstAmount: chargesGst,
    };
}

interface CreateReference {
    items: InvoiceItemPayload[];
    charges: ExtraChargePayload[];
}

interface CreateOptions {
    itemsEdited: boolean;
    chargesEdited: boolean;
}

export function mapPurchaseInvoiceFormToCreateDTO(
    values: PurchaseInvoiceFormValues,
    projectId: number,
    reference: Partial<CreateReference> = {},
    options: Partial<CreateOptions> = {}
): CreatePurchaseInvoiceDTO {
    const items = itemsToPayload(values.items);
    const extraCharges = chargesToPayload(values.extraCharges);

    const itemsChanged = options.itemsEdited !== false && JSON.stringify(items) !== JSON.stringify(reference.items ?? []);
    const chargesChanged = options.chargesEdited !== false && JSON.stringify(extraCharges) !== JSON.stringify(reference.charges ?? []);

    return {
        projectId,
        invoiceNo: values.invoiceNo.trim(),
        category: values.category,
        partyName: values.partyName,
        valuePreGst: values.valuePreGst!,
        gstAmount: values.gstAmount!,
        invoiceDate: values.invoiceDate,
        invoiceFile: values.invoiceFile?.length ? values.invoiceFile[0] : undefined,
        purchaseOrderId: values.selectedPoId ? Number(values.selectedPoId) : 0,
        vendorWorkOrderId: values.selectedVwoId ? Number(values.selectedVwoId) : undefined,
        ...(itemsChanged ? { items } : {}),
        ...(chargesChanged ? { extraCharges } : {}),
    };
}

export function mapPurchaseInvoiceFormToUpdateDTO(values: PurchaseInvoiceFormValues): UpdatePurchaseInvoiceDTO {
    return {
        invoiceNo: values.invoiceNo.trim(),
        category: values.category,
        partyName: values.partyName,
        valuePreGst: values.valuePreGst!,
        gstAmount: values.gstAmount!,
        invoiceDate: values.invoiceDate,
        invoiceFile: values.invoiceFile?.length ? values.invoiceFile[0] : undefined,
    };
}
