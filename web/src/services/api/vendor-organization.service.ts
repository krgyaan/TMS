import { BaseApiService } from "./base.service";
import type {
    VendorOrganization,
    VendorOrganizationWithRelations,
    CreateVendorOrganizationDto,
    UpdateVendorOrganizationDto,
    CreateVendorOrganizationWithRelationsDto,
    UpdateVendorOrganizationWithRelationsDto,
} from "@/types/api.types";

class VendorOrganizationsService extends BaseApiService {
    constructor() {
        super("/vendor-organizations");
    }

    async getAll(): Promise<VendorOrganization[]> {
        const res = await this.get<{ data: VendorOrganization[] }>("");
        return res.data;
    }

    async getAllWithRelations(): Promise<VendorOrganizationWithRelations[]> {
        return this.get<VendorOrganizationWithRelations[]>("/with-relations");
    }

    async getById(id: number): Promise<VendorOrganization> {
        return this.get<VendorOrganization>(`/${id}`);
    }

    async getByIdWithRelations(id: number): Promise<VendorOrganizationWithRelations> {
        return this.get<VendorOrganizationWithRelations>(`/${id}/with-relations`);
    }

    async create(data: CreateVendorOrganizationDto): Promise<VendorOrganization> {
        return this.post<VendorOrganization>("", data);
    }

    async update(id: number, data: UpdateVendorOrganizationDto): Promise<VendorOrganization> {
        return this.patch<VendorOrganization>(`/${id}`, data);
    }

    async createWithRelations(data: CreateVendorOrganizationWithRelationsDto): Promise<VendorOrganizationWithRelations> {
        return this.post<VendorOrganizationWithRelations>("/with-relations", data);
    }

    async updateWithRelations(id: number, data: UpdateVendorOrganizationWithRelationsDto): Promise<VendorOrganizationWithRelations> {
        return this.patch<VendorOrganizationWithRelations>(`/${id}/with-relations`, data);
    }

    //   async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    //   }
}

export const vendorOrganizationsService = new VendorOrganizationsService();
