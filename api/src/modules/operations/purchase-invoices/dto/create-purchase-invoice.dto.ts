import { z } from "zod";

const extraChargeSchema = z.object({
    label: z.string().min(1, "Charge label is required"),
    amount: z.number().min(0, "Charge amount must be >= 0"),
    gstRate: z.number().min(0, "GST rate must be >= 0").max(100),
});

const itemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().optional(),
    qty: z.number().positive("Quantity must be > 0"),
    unit: z.string().optional(),
    rate: z.number().positive("Rate must be > 0"),
    gstRate: z.number().min(0, "GST rate must be >= 0").max(100),
});

export const createPurchaseInvoiceSchema = z
    .object({
        projectId: z.number(),
        invoiceNo: z.string().min(1, "Invoice number is required"),
        category: z.string().optional(),
        partyName: z.string().optional(),
        valuePreGst: z.number().min(0, "Value must be >= 0").optional(),
        gstAmount: z.number().min(0, "GST amount must be >= 0").optional(),
        invoiceDate: z.string().min(1, "Invoice date is required"),
        uploadedBy: z.number().optional(),
        invoiceFile: z.string().optional(),
        purchaseOrderId: z.number().optional(),
        vendorWorkOrderId: z.number().optional(),
        items: z.array(itemSchema).optional(),
        extraCharges: z.array(extraChargeSchema).optional(),
    })
    .refine(data => Boolean(data.purchaseOrderId) !== Boolean(data.vendorWorkOrderId), {
        message: "Purchase invoice must be linked to exactly one Purchase Order or Vendor Work Order",
    });

export type CreatePurchaseInvoiceDto = z.infer<typeof createPurchaseInvoiceSchema>;
