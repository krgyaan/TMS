import { z } from "zod";

const AmcSiteContactSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1),
    organization: z.string().nullable().optional(),
    mobile: z.string().min(1),
    email: z.string().nullable().optional(),
});

const AmcSiteSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1),
    address: z.string().min(1),
    mapLink: z.string().nullable().optional(),
    contacts: z.array(AmcSiteContactSchema).default([]),
});

const AmcProductSchema = z.object({
    id: z.number().int().positive().optional(),
    itemId: z.number().int().positive(),
    description: z.string().nullable().optional(),
    make: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    serialNo: z.string().nullable().optional(),
    quantity: z.number().int().positive().default(1),
});

const AmcServiceEngineerSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1),
    organization: z.string().nullable().optional(),
    mobile: z.string().min(1),
    email: z.string().nullable().optional(),
});

const VariableBillItemSchema = z.object({
    label: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
});

export type VariableBillItemDto = z.infer<typeof VariableBillItemSchema>;

export const CreateAmcSchema = z.object({
    teamName: z.string().min(1),
    projectId: z.number().int().positive(),
    allocatedTe: z.number().int().positive().nullable().optional(),
    serviceFrequency: z.string().min(1),
    amcStartDate: z.string().date(),
    nextServiceDue: z.string().date().optional(),
    amcEndDate: z.string().date(),
    billFrequency: z.string().min(1),
    billType: z.enum(["constant", "variable"]).default("constant"),
    billValue: z.coerce.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid decimal format").optional(),
    variableBills: z.array(VariableBillItemSchema).optional(),
    amcPoPath: z.string().nullable().optional(),
    serviceReportPath: z.array(z.string()).nullable().optional(),
    signedServiceReportPath: z.string().nullable().optional(),
    sites: z.array(AmcSiteSchema).default([]),
    products: z.array(AmcProductSchema).default([]),
    serviceEngineers: z.array(AmcServiceEngineerSchema).default([]),
});

export const UpdateAmcSchema = CreateAmcSchema.partial();

export type AmcSiteContactDto = z.infer<typeof AmcSiteContactSchema>;
export type AmcSiteDto = z.infer<typeof AmcSiteSchema>;
export type AmcProductDto = z.infer<typeof AmcProductSchema>;
export type AmcServiceEngineerDto = z.infer<typeof AmcServiceEngineerSchema>;
export type CreateAmcDto = z.infer<typeof CreateAmcSchema>;
export type UpdateAmcDto = z.infer<typeof UpdateAmcSchema>;