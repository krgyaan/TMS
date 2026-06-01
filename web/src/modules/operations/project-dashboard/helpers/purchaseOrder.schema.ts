import { z } from "zod";

const productItemSchema = z.object({
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().min(1, "HSN/SAC is required"),
    qty: z.number().nullable().refine(v => v !== null && v > 0, "Qty must be greater than 0"),
    rate: z.number().nullable().refine(v => v !== null && v >= 0, "Rate is required"),
    gstRate: z.number().default(18),
});

export const purchaseOrderFormSchema = z.object({
    poDate: z.string().min(1, "PO date is required"),

    sellerId: z.string().default(""),
    sellerName: z.string().min(1, "Seller name is required"),
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
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string().default(""),
    shipToPan: z.string().default(""),

    products: z.array(productItemSchema).min(1, "At least one product is required"),

    quotationNo: z.string().default(""),
    quotationDate: z.string().default(""),
    warrantyDispatch: z.string().default(""),
    warrantyInstallation: z.string().default(""),
    freight: z.string().default(""),
    deliveryPeriod: z.string().default(""),
    transitInsurance: z.string().default(""),
    materialUnloading: z.string().default(""),
    paymentTerms: z.string().default(""),
    poRaisedBy: z.string().default(""),
    technicalSpecifications: z.string().default(""),
    technicalSpecsAttachments: z.array(z.string()).default([]),
    accessoriesPackagingList: z.string().default(""),
    accessoriesPackagingListAttachments: z.array(z.string()).default([]),
    preDispatchInspection: z.string().default(""),
    deliveryLocation: z.string().default(""),
    acceptanceOfOrder: z.string().default(""),
    documentation: z.string().default(""),
    remarks: z.string().default(""),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
export type ProductFormItem = z.infer<typeof productItemSchema>;
