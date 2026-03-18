import { z } from "zod";
import { DecimalSchema, PositiveIntSchema } from "./wo-details.dto";

// ============================================
// PAGE 4: BILLING
// ============================================

/**
 * BOQ Item Schema
 */
export const BOQItemSchema = z.object({
  id: PositiveIntSchema.optional(),
  srNo: z.number().int().positive("SR No must be positive"),
  itemDescription: z.string().min(1, "Item description is required"),
  quantity: DecimalSchema,
  rate: DecimalSchema,
  amount: DecimalSchema.optional(), // Calculated server-side
  sortOrder: z.number().int().optional(),
});

export type BOQItemDto = z.infer<typeof BOQItemSchema>;

/**
 * SR Nos type (array of numbers or 'all')
 */
export const SrNosSchema = z.union([
  z.array(z.number().int().positive()).min(1, "At least one SR No is required"),
  z.literal("all"),
]);

export type SrNosDto = z.infer<typeof SrNosSchema>;

/**
 * GST Number Schema
 */
export const GSTSchema = z
  .string()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GST format"
  )
  .length(15);

/**
 * Address Schema
 */
export const AddressSchema = z.object({
  id: PositiveIntSchema.optional(),
  srNos: SrNosSchema,
  customerName: z.string().min(1, "Customer name is required").max(255),
  address: z.string().min(1, "Address is required"),
  gst: GSTSchema.nullable().optional().or(z.literal("")),
});

export type AddressDto = z.infer<typeof AddressSchema>;

/**
 * Save Page 4 data (all optional for drafts)
 */
export const SavePage4Schema = z.object({
  billingBoq: z.array(BOQItemSchema).optional(),
  buybackBoq: z.array(BOQItemSchema).optional(),
  billingAddresses: z.array(AddressSchema).optional(),
  shippingAddresses: z.array(AddressSchema).optional(),
});

export type SavePage4Dto = z.infer<typeof SavePage4Schema>;

/**
 * Submit Page 4 (validates required fields)
 */
export const SubmitPage4Schema = z.object({
  billingBoq: z
    .array(BOQItemSchema)
    .min(1, "At least one billing BOQ item is required"),
  buybackBoq: z.array(BOQItemSchema).optional().default([]),
  billingAddresses: z
    .array(AddressSchema)
    .min(1, "At least one billing address is required"),
  shippingAddresses: z
    .array(AddressSchema)
    .min(1, "At least one shipping address is required"),
});

export type SubmitPage4Dto = z.infer<typeof SubmitPage4Schema>;

/**
 * Page 4 response
 */
export const Page4ResponseSchema = z.object({
  billingBoq: z.array(
    BOQItemSchema.extend({
      id: z.number(),
      amount: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  buybackBoq: z.array(
    BOQItemSchema.extend({
      id: z.number(),
      amount: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  billingAddresses: z.array(
    AddressSchema.extend({
      id: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  shippingAddresses: z.array(
    AddressSchema.extend({
      id: z.number(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  billingTotal: z.string(),
  buybackTotal: z.string(),
});

export type Page4ResponseDto = z.infer<typeof Page4ResponseSchema>;
