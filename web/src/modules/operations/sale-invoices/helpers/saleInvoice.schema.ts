import { z } from "zod";

const saleInvoiceItemSchema = z.object({
    srNo: z.number().optional(),
    itemDescription: z.string().min(1, "Description is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number().default(18),
});

export const saleInvoiceFormSchema = z.object({
    invoiceDate: z.string().min(1, "Invoice date is required"),
    billingCustomerName: z.string().min(1, "Billing customer name is required"),
    billingAddress: z.string().min(1, "Billing address is required"),
    billingGst: z.string().default(""),
    shippingCustomerName: z.string().min(1, "Shipping customer name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shippingGst: z.string().default(""),
    items: z.array(saleInvoiceItemSchema).min(1, "At least one item is required"),
    remarks: z.string().default(""),
});

export type SaleInvoiceFormValues = z.infer<typeof saleInvoiceFormSchema>;
export type SaleInvoiceItemForm = z.infer<typeof saleInvoiceItemSchema>;
