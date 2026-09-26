import { z } from "zod";

export const OrgFormSchema = z.object({
    name: z.string().min(1, "Organization name is required").max(255),
    alias: z.string().max(255).optional(),
    msme: z.string().max(50).optional(),
    pan: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    status: z.boolean(),
});

export const GstFormSchema = z.object({
    id: z.number().optional(),
    gstState: z.string().min(1, "GST state is required"),
    gstNo: z.string().min(1, "GST number is required"),
    address: z.string().max(500).optional(),
    status: z.boolean(),
});

export const AccountFormSchema = z.object({
    id: z.number().optional(),
    bankAccountName: z.string().min(1, "Account name is required"),
    accountNum: z.string().min(1, "Account number is required"),
    ifscCode: z.string().min(1, "IFSC code is required"),
    status: z.boolean(),
});

export const PersonFormSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "Person name is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    mobile: z.string().min(1, "Mobile number is required"),
    address: z.string().optional(),
    status: z.boolean(),
});

export const FileFormSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, "File name is required"),
    filePath: z.string().min(1, "File path is required"),
});

export const VendorFormSchema = z.object({
    organization: OrgFormSchema,
    gsts: z.array(GstFormSchema),
    accounts: z.array(AccountFormSchema),
    persons: z.array(PersonFormSchema),
    files: z.array(FileFormSchema),
});

export type OrgFormValues = z.infer<typeof OrgFormSchema>;
export type GstFormValues = z.infer<typeof GstFormSchema>;
export type AccountFormValues = z.infer<typeof AccountFormSchema>;
export type PersonFormValues = z.infer<typeof PersonFormSchema>;
export type FileFormValues = z.infer<typeof FileFormSchema>;
export type VendorFormValues = z.infer<typeof VendorFormSchema>;
