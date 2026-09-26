import type {
    CreateVendorAccountDto,
    CreateVendorDto,
    CreateVendorFileDto,
    CreateVendorGstDto,
    UpdateVendorAccountDto,
    UpdateVendorDto,
    UpdateVendorFileDto,
    UpdateVendorGstDto,
    Vendor,
    VendorAcc,
    VendorFile,
    VendorGst,
    VendorOrganizationWithRelations,
} from "@/types/api.types";
import type { AccountFormValues, FileFormValues, GstFormValues, PersonFormValues, VendorFormValues } from "./vendorForm.schema";

// API entity -> form value

export const gstApiToForm = (gst: VendorGst): GstFormValues => ({
    id: gst.id,
    gstState: gst.gstState,
    gstNo: gst.gstNo,
    status: gst.status,
});

export const accountApiToForm = (account: VendorAcc): AccountFormValues => ({
    id: account.id,
    bankAccountName: account.bankAccountName,
    accountNum: account.accountNum,
    ifscCode: account.ifscCode,
    status: account.status,
});

export const personApiToForm = (person: Vendor): PersonFormValues => ({
    id: person.id,
    name: person.name,
    email: person.email ?? "",
    mobile: person.mobile ?? "",
    address: person.address,
    status: person.status,
});

export const fileApiToForm = (file: VendorFile): FileFormValues => ({
    id: file.id,
    name: file.name,
    filePath: file.filePath,
});

export const vendorOrgToFormValues = (organization: VendorOrganizationWithRelations): VendorFormValues => ({
    organization: {
        name: organization.name,
        alias: organization.alias ?? "",
        msme: organization.msme ?? "",
        pan: organization.pan ?? "",
        address: organization.address ?? "",
        status: organization.status,
    },
    gsts: (organization.gsts ?? []).map(gstApiToForm),
    accounts: (organization.accounts ?? []).map(accountApiToForm),
    persons: (organization.persons ?? []).map(personApiToForm),
    files: (organization.files ?? []).map(fileApiToForm),
});

// form value -> API DTO

export const toCreateGstDto = (gst: GstFormValues, orgId: number): CreateVendorGstDto => ({
    orgId,
    gstState: gst.gstState,
    gstNo: gst.gstNo,
    status: gst.status,
});

export const toUpdateGstDto = (gst: GstFormValues): UpdateVendorGstDto => ({
    gstState: gst.gstState,
    gstNo: gst.gstNo,
    status: gst.status,
});

export const toCreateAccountDto = (account: AccountFormValues, orgId: number): CreateVendorAccountDto => ({
    orgId,
    bankAccountName: account.bankAccountName,
    accountNum: account.accountNum,
    ifscCode: account.ifscCode,
    status: account.status,
});

export const toUpdateAccountDto = (account: AccountFormValues): UpdateVendorAccountDto => ({
    bankAccountName: account.bankAccountName,
    accountNum: account.accountNum,
    ifscCode: account.ifscCode,
    status: account.status,
});

export const toCreatePersonDto = (person: PersonFormValues, orgId: number): CreateVendorDto => ({
    orgId,
    name: person.name,
    email: person.email,
    address: person.address,
    status: person.status,
});

export const toUpdatePersonDto = (person: PersonFormValues): UpdateVendorDto => ({
    name: person.name,
    email: person.email,
    address: person.address,
    status: person.status,
});

export const toCreateFileDto = (file: FileFormValues, orgId: number): CreateVendorFileDto => ({
    orgId,
    name: file.name,
    filePath: file.filePath,
});

export const toUpdateFileDto = (file: FileFormValues): UpdateVendorFileDto => ({
    name: file.name,
    filePath: file.filePath,
});
