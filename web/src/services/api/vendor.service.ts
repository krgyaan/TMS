import { BaseApiService } from "./base.service";
import type {
    Vendor,
    VendorWithRelations,
    CreateVendorDto,
    UpdateVendorDto,
    VendorOrganization,
    VendorOrganizationWithRelations,
    CreateVendorOrganizationDto,
    UpdateVendorOrganizationDto,
    CreateVendorOrganizationWithRelationsDto,
    UpdateVendorOrganizationWithRelationsDto,
    VendorGst,
    CreateVendorGstDto,
    UpdateVendorGstDto,
    VendorAcc,
    CreateVendorAccountDto,
    UpdateVendorAccountDto,
    VendorFile,
    CreateVendorFileDto,
    UpdateVendorFileDto,
} from "@/types/api.types";

class VendorsApiService extends BaseApiService {
    constructor() {
        super("");
    }

    async getAllVendors(): Promise<Vendor[]> {
        return this.get<Vendor[]>("/vendors");
    }

    async getVendorById(id: number): Promise<Vendor> {
        return this.get<Vendor>(`/vendors/${id}`);
    }

    async getVendorByIdWithRelations(id: number): Promise<VendorWithRelations> {
        return this.get<VendorWithRelations>(`/vendors/${id}/with-relations`);
    }

    async getVendorsByOrganization(organizationId: number): Promise<Vendor[]> {
        return this.get<Vendor[]>(`/vendors/organization/${organizationId}`);
    }

    async createVendor(data: CreateVendorDto): Promise<Vendor> {
        return this.post<Vendor>("/vendors", data);
    }

    async updateVendor(id: number, data: UpdateVendorDto): Promise<Vendor> {
        return this.patch<Vendor>(`/vendors/${id}`, data);
    }

    async deleteVendor(id: number): Promise<void> {
        return this.delete<void>(`/vendors/${id}`);
    }

    async getAllOrganizations(): Promise<VendorOrganization[]> {
        console.log("Fetching all vendor organizations");
        const res = await this.get<VendorOrganization[]>("/vendor-organizations");
        console.log(res);
        return res;
    }

    async getAllOrganizationsWithRelations(): Promise<VendorOrganizationWithRelations[]> {
        return this.get<VendorOrganizationWithRelations[]>("/vendor-organizations/with-relations");
    }

    async getOrganizationById(id: number): Promise<VendorOrganization> {
        return this.get<VendorOrganization>(`/vendor-organizations/${id}`);
    }

    async getOrganizationByIdWithRelations(id: number): Promise<VendorOrganizationWithRelations> {
        return this.get<VendorOrganizationWithRelations>(`/vendor-organizations/${id}/with-relations`);
    }

    async createOrganization(data: CreateVendorOrganizationDto): Promise<VendorOrganization> {
        return this.post<VendorOrganization>("/vendor-organizations", data);
    }

    async updateOrganization(id: number, data: UpdateVendorOrganizationDto): Promise<VendorOrganization> {
        return this.patch<VendorOrganization>(`/vendor-organizations/${id}`, data);
    }

    async createOrganizationWithRelations(data: CreateVendorOrganizationWithRelationsDto): Promise<VendorOrganizationWithRelations> {
        return this.post<VendorOrganizationWithRelations>("/vendor-organizations/with-relations", data);
    }

    async updateOrganizationWithRelations(id: number, data: UpdateVendorOrganizationWithRelationsDto): Promise<VendorOrganizationWithRelations> {
        return this.patch<VendorOrganizationWithRelations>(`/vendor-organizations/${id}/with-relations`, data);
    }

    async getAllGsts(): Promise<VendorGst[]> {
        return this.get<VendorGst[]>("/vendor-gsts");
    }

    async getGstById(id: number): Promise<VendorGst> {
        return this.get<VendorGst>(`/vendor-gsts/${id}`);
    }

    async getGstsByOrganization(orgId: number): Promise<VendorGst[]> {
        return this.get<VendorGst[]>(`/vendor-gsts/organization/${orgId}`);
    }

    async createGst(data: CreateVendorGstDto): Promise<VendorGst> {
        return this.post<VendorGst>("/vendor-gsts", data);
    }

    async updateGst(id: number, data: UpdateVendorGstDto): Promise<VendorGst> {
        return this.patch<VendorGst>(`/vendor-gsts/${id}`, data);
    }

    async deleteGst(id: number): Promise<void> {
        return this.delete<void>(`/vendor-gsts/${id}`);
    }

    async getAllAccounts(): Promise<VendorAcc[]> {
        return this.get<VendorAcc[]>("/vendor-accounts");
    }

    async getAccountById(id: number): Promise<VendorAcc> {
        return this.get<VendorAcc>(`/vendor-accounts/${id}`);
    }

    async getAccountsByOrganization(orgId: number): Promise<VendorAcc[]> {
        return this.get<VendorAcc[]>(`/vendor-accounts/organization/${orgId}`);
    }

    async createAccount(data: CreateVendorAccountDto): Promise<VendorAcc> {
        return this.post<VendorAcc>("/vendor-accounts", data);
    }

    async updateAccount(id: number, data: UpdateVendorAccountDto): Promise<VendorAcc> {
        return this.patch<VendorAcc>(`/vendor-accounts/${id}`, data);
    }

    async deleteAccount(id: number): Promise<void> {
        return this.delete<void>(`/vendor-accounts/${id}`);
    }

    async getAllVendorFiles(): Promise<VendorFile[]> {
        return this.get<VendorFile[]>("/vendor-files");
    }

    async getVendorFileById(id: number): Promise<VendorFile> {
        return this.get<VendorFile>(`/vendor-files/${id}`);
    }

    async getVendorFilesByOrg(orgId: number): Promise<VendorFile[]> {
        return this.get<VendorFile[]>(`/vendor-files/org/${orgId}`);
    }

    async createVendorFile(data: CreateVendorFileDto): Promise<VendorFile> {
        return this.post<VendorFile>("/vendor-files", data);
    }

    async updateVendorFile(id: number, data: UpdateVendorFileDto): Promise<VendorFile> {
        return this.patch<VendorFile>(`/vendor-files/${id}`, data);
    }

    async deleteVendorFile(id: number): Promise<void> {
        return this.delete<void>(`/vendor-files/${id}`);
    }
}

export const vendorApi = new VendorsApiService();
