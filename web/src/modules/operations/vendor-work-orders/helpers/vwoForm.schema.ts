import { z } from "zod";

export const productItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().min(1, "HSN/SAC is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number().default(18),
});

const termRowSchema = z.object({
    field: z.string().min(1, "Field is required"),
    value: z.string().default(""),
});

export type ProductFormItem = z.infer<typeof productItemSchema>;
export type TermFormItem = z.infer<typeof termRowSchema>;

export const vendorWorkOrderFormSchema = z.object({
    woDate: z.string().min(1, "WO date is required"),

    sellerId: z.string().default(""),
    sellerName: z.string().min(1, "Vendor name is required"),
    sellerEmail: z.string().default(""),
    sellerAddress: z.string().default(""),
    sellerGstNo: z.string().default(""),
    sellerPanNo: z.string().default(""),
    sellerMsmeNo: z.string().default(""),
    sellerCinNo: z.string().default(""),
    contactPersonName: z.string().default(""),
    contactPersonPhone: z.string().default(""),
    contactPersonEmail: z.string().default(""),

    partyId: z.string().default(""),
    selectedUserId: z.string().default(""),
    selectedCertRecipient: z.string().default(""),
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string().default(""),
    shipToPan: z.string().default(""),

    products: z.array(productItemSchema).min(1, "At least one product is required"),

    termsAndConditions: z.array(termRowSchema).default([]),
    scopeOfWork: z.array(z.string()).default([]),
    accessoriesPackagingListAttachments: z.array(z.string()).default([]),
    remarks: z.string().default(""),
});

export type VendorWorkOrderFormValues = z.infer<typeof vendorWorkOrderFormSchema>;
