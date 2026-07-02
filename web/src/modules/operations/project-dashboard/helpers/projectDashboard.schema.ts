import { z } from "zod";

export const CreateProductSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "Description is required"),
    hsnSac: z.string().min(1, "HSN/SAC is required"),
    qty: z.number().min(1, "Quantity must be at least 1"),
    rate: z.number().min(1, "Rate must be at least 1"),
    gstRate: z.number().min(0).max(28),
});

export const SellerInfoSchema = z.object({
    sellerId: z.string(),
    sellerName: z.string().min(1, "Seller name is required"),
    sellerEmail: z.string(),
    sellerAddress: z.string(),
    sellerGstNo: z.string(),
    sellerPanNo: z.string(),
    sellerMsmeNo: z.string(),
});

export const ShipToInfoSchema = z.object({
    partyId: z.string(),
    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string(),
    shipToPan: z.string(),
});

export const CreatePurchaseOrderFormSchema = z.object({
    poDate: z.string().min(1, "PO date is required"),
    sellerInfo: SellerInfoSchema,
    shipToInfo: ShipToInfoSchema,
    products: z.array(CreateProductSchema).min(1, "At least one product is required"),
    quotationNo: z.string().optional(),
    quotationDate: z.string().optional(),
    paymentTerms: z.string().optional(),
    deliveryPeriod: z.string().optional(),
    remarks: z.string().optional(),
});

export type CreatePurchaseOrderFormValues = z.infer<typeof CreatePurchaseOrderFormSchema>;
export type SellerInfoFormValues = z.infer<typeof SellerInfoSchema>;
export type ShipToInfoFormValues = z.infer<typeof ShipToInfoSchema>;
export type CreateProductFormValues = z.infer<typeof CreateProductSchema>;
