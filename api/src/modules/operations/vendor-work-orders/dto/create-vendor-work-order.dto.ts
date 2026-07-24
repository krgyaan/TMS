import { z } from "zod";

export const createVendorWorkOrderSchema = z.object({
    tenderId: z.number(),
    projectId: z.number().optional(),
    projectName: z.string().optional(),
    woDate: z.string().min(1, "WO date is required"),
    sellerId: z.number().optional(),
    shipToPartyId: z.number().optional(),
    category: z.string().optional().default(""),

    sellerName: z.string().min(1, "Seller name is required"),
    sellerEmail: z.string().optional().default(""),
    sellerAddress: z.string().optional().default(""),
    sellerGstNo: z.string().optional().default(""),
    sellerPanNo: z.string().optional().default(""),
    sellerMsmeNo: z.string().optional().default(""),
    sellerCinNo: z.string().optional().default(""),

    contactPersonName: z.string().optional().default(""),
    contactPersonPhone: z.string().optional().default(""),
    contactPersonEmail: z.string().optional().default(""),
    certRecipients: z.array(z.number()).optional(),

    shipToName: z.string().min(1, "Ship to name is required"),
    shippingAddress: z.string().min(1, "Shipping address is required"),
    shipToGst: z.string().optional().default(""),
    shipToPan: z.string().optional().default(""),

    products: z.array(z.object({
        description: z.string().min(1, "Description is required"),
        qty: z.number(),
        rate: z.number(),
        gstRate: z.number().default(18),
    })).min(1, "At least one product is required"),

    termsAndConditions: z.array(z.object({
        field: z.string(),
        value: z.string(),
    })).optional(),

    remarks: z.string().optional().default(""),
    scopeOfWork: z.string().optional(),
    accessoriesPackagingListAttachments: z.string().optional(),
});

export type CreateVendorWorkOrderDto = z.infer<typeof createVendorWorkOrderSchema>;
