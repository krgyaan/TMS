import { z } from "zod";

const saleInvoiceItemSchema = z.object({
    srNo: z.number().optional(),
    itemDescription: z.string().min(1, "Description is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.coerce.number().default(18),
    purchaseOrderProductId: z.number().optional(),
    unit: z.string().optional(),
    hsnSac: z.string().optional(),
});

export const saleInvoiceFormSchema = z.object({
    invoiceDate: z.string().min(1, "Invoice date is required"),
    billingCustomerName: z.string().min(1, "Billing customer name is required"),
    billingAddress: z.string().min(1, "Billing address is required"),
    billingGst: z.string().default(""),
    billingEmail: z.string().default(""),
    billingPanNo: z.string().default(""),
    billingMsmeNo: z.string().default(""),
    billingCinNo: z.string().default(""),
    shippingCustomerName: z.string().min(1, "Shipping customer name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shippingGst: z.string().default(""),
    shippingPanNo: z.string().default(""),
    selectedBillingAddressId: z.string().optional(),
    selectedShippingAddressId: z.string().optional(),
    sellerId: z.string().optional(),
    partyId: z.string().optional(),
    dispatchFromName: z.string().default(""),
    dispatchFromAddress: z.string().default(""),
    dispatchFromGst: z.string().default(""),
    dispatchVehicleNo: z.string().default(""),
    dispatchLrNo: z.string().default(""),
    dispatchToName: z.string().default(""),
    dispatchToAddress: z.string().default(""),
    dispatchToGst: z.string().default(""),
    items: z.array(saleInvoiceItemSchema).min(1, "At least one item is required"),
    remarks: z.string().default(""),
});

export type SaleInvoiceFormValues = z.infer<typeof saleInvoiceFormSchema>;
export type SaleInvoiceItemForm = z.infer<typeof saleInvoiceItemSchema>;