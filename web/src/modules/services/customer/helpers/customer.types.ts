import { z } from "zod";
import { tenderFilesService } from "@/services/api/tender-files.service";

export interface CustomerServiceEngineer {
    id?: number;
    name: string;
    phone: string;
    email: string;
    allotedBy?: number | null;
}

export interface AllotEngineerDto {
    name: string;
    email: string;
    phone: string;
}

export interface CustomerComplaint {
    id: number;
    name: string;
    organization: string | null;
    designation: string | null;
    phone: string;
    email: string;
    siteProjectName: string;
    poNo: string | null;
    siteLocation: string;
    attachment: string | null;
    issueFaced: string | null;
    status: string | null;
    ticketNo: string | null;
    createdBy: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CustomerComplaintListItem extends CustomerComplaint {
    allottedAt: string | null;
}

export interface CustomerComplaintDetail extends CustomerComplaint {
    engineers: CustomerServiceEngineer[];
}

export interface CreateCustomerComplaintDto {
    name: string;
    organization?: string | null;
    designation?: string | null;
    phone: string;
    email: string;
    siteProjectName: string;
    poNo?: string | null;
    siteLocation: string;
    attachment?: string | null;
    issueFaced?: string | null;
    status?: string;
    engineers?: CustomerServiceEngineer[];
}

export type UpdateCustomerComplaintDto = Partial<CreateCustomerComplaintDto>;

export const CustomerFormSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    organization: z.string().optional(),
    designation: z.string().optional(),
    email: z.string().email({ message: "Enter a valid email" }),
    phone: z.string().min(1, { message: "Phone No. is required" }),
    siteProjectName: z.string().min(1, { message: "Site/Project Name is required" }),
    poNo: z.string().optional(),
    siteLocation: z.string().min(1, { message: "Site Location is required" }),
    issueFaced: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof CustomerFormSchema>;

export const customerFormDefaultValues: CustomerFormValues = {
    name: "",
    organization: "",
    designation: "",
    email: "",
    phone: "",
    siteProjectName: "",
    poNo: "",
    siteLocation: "",
    issueFaced: "",
};

export const customerAttachmentUrl = (value?: string | null): string =>
    value ? tenderFilesService.getFileUrl(value) : "";