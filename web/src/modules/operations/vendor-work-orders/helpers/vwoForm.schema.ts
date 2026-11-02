import { z } from "zod";

export const productItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    qty: z
        .number()
        .nullable()
        .refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z
        .number()
        .nullable()
        .refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number(),
});

const termRowSchema = z.object({
    field: z.string().min(1, "Field is required"),
    value: z.string(),
});

export type ProductFormItem = z.infer<typeof productItemSchema>;
export type TermFormItem = z.infer<typeof termRowSchema>;

export const vendorWorkOrderFormSchema = z.object({
    woDate: z.string().min(1, "WO date is required"),
    category: z.string(),

    sellerId: z.string(),
    sellerGstId: z.string(),
    sellerName: z.string().min(1, "Vendor name is required"),
    sellerEmail: z.string(),
    sellerAddress: z.string(),
    sellerGstNo: z.string(),
    sellerPanNo: z.string(),
    sellerMsmeNo: z.string(),
    sellerCinNo: z.string(),
    // Our-side contact, filled by "Quick Fill from Team Member".
    contactPersonName: z.string(),
    contactPersonPhone: z.string(),
    contactPersonEmail: z.string(),
    // Vendor-side contact, filled by the seller's contact person picker.
    vendorPersonId: z.string(),
    vendorContactPersonName: z.string(),
    vendorContactPersonPhone: z.string(),
    vendorContactPersonEmail: z.string(),

    partyId: z.string(),
    selectedUserId: z.string(),
    selectedCertRecipients: z.array(z.string()),
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string(),
    shipToPan: z.string(),

    products: z.array(productItemSchema).min(1, "At least one product is required"),

    termsAndConditions: z.array(termRowSchema),
    scopeOfWork: z.array(z.string()),
    accessoriesPackagingListAttachments: z.array(z.string()),
    remarks: z.string(),
});

export type VendorWorkOrderFormValues = z.infer<typeof vendorWorkOrderFormSchema>;
