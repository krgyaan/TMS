import { z } from "zod";

const ServiceEngineerSchema = z.object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().min(1),
    status: z.enum(["0", "1"]).default("1"),
    allotedBy: z.number().int().positive().optional(),
});

export const CreateCustomerComplaintSchema = z.object({
    name: z.string().min(1),
    organization: z.string().nullable().optional(),
    designation: z.string().nullable().optional(),
    phone: z.string().min(1),
    email: z.string().min(1),
    siteProjectName: z.string().min(1),
    poNo: z.string().nullable().optional(),
    siteLocation: z.string().min(1),
    attachment: z.string().nullable().optional(),
    issueFaced: z.string().nullable().optional(),
    status: z.string().optional(),
    engineers: z.array(ServiceEngineerSchema).default([]),
});

export const UpdateCustomerComplaintSchema = CreateCustomerComplaintSchema.partial();

export type CreateCustomerComplaintDto = z.infer<typeof CreateCustomerComplaintSchema>;
export type UpdateCustomerComplaintDto = z.infer<typeof UpdateCustomerComplaintSchema>;
