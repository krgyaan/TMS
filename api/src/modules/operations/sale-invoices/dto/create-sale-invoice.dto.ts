import { z } from "zod";

export const createSaleInvoiceSchema = z.object({
    projectId: z.number(),
    woDetailId: z.number().optional(),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    billingCustomerName: z.string().min(1, "Billing customer name is required"),
    billingAddress: z.string().min(1, "Billing address is required"),
    billingGst: z.string().optional().default(""),
    shippingCustomerName: z.string().min(1, "Shipping customer name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shippingGst: z.string().optional().default(""),
    items: z.array(z.object({
        srNo: z.number().optional(),
        itemDescription: z.string().min(1, "Description is required"),
        qty: z.number(),
        rate: z.number(),
        gstRate: z.number().default(18),
    })).min(1, "At least one item is required"),
    remarks: z.string().optional().default(""),
});
