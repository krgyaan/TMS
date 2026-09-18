import { z } from 'zod';

const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Invalid decimal format. Use up to 2 decimal places')
  .or(z.number().transform(val => val.toString()));

const eventTypeSchema = z.enum([
  'purchase_invoice_booked',
  'payment_request_created',
  'payment_processed',
  'tds_deducted',
  'gst_booked',
  'advance_received',
  'advance_utilized',
  'retention_held',
  'retention_released',
  'refund_received',
  'write_off',
  'adjustment',
]);

export const createCashFlowSchema = z.object({
  projectId: z.number().int().positive('Project ID is required'),
  eventType: eventTypeSchema,
  amount: decimalString,
  direction: z.enum(['inflow', 'outflow']).default('outflow'),
  referenceType: z.string().max(50).optional(),
  referenceId: z.number().int().positive().optional(),
  referenceNo: z.string().max(255).optional(),
  tdsPercentage: decimalString.optional(),
  tdsAmount: decimalString.optional(),
  gstAmount: decimalString.optional(),
  remark: z.string().optional(),
  createdBy: z.number().int().positive().optional(),
});

export const updateCashFlowSchema = z.object({
  amount: decimalString.optional(),
  direction: z.enum(['inflow', 'outflow']).optional(),
  remark: z.string().optional(),
});

export const cashFlowQuerySchema = z.object({
  eventType: eventTypeSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export type CreateCashFlowDto = z.infer<typeof createCashFlowSchema>;
export type UpdateCashFlowDto = z.infer<typeof updateCashFlowSchema>;
export type CashFlowQueryDto = z.infer<typeof cashFlowQuerySchema>;