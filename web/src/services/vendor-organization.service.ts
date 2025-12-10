import { BaseApiService } from './base.service';
import type {
    VendorOrganization,
    VendorOrganizationWithRelations,
    CreateVendorOrganizationDto,
    UpdateVendorOrganizationDto,
} from '@/types/api.types';

class VendorOrganizationsService extends BaseApiService {
    constructor() {
        super('/vendor-organizations');
    }

    async getAll(): Promise<VendorOrganization[]> {
        return this.get<VendorOrganization[]>('');
    }

    async getAllWithRelations(): Promise<VendorOrganizationWithRelations[]> {
        return this.get<VendorOrganizationWithRelations[]>('/with-relations');
    }

    async getById(id: number): Promise<VendorOrganization> {
        return this.get<VendorOrganization>(`/${id}`);
    }

    async getByIdWithRelations(
        id: number,
    ): Promise<VendorOrganizationWithRelations> {
        return this.get<VendorOrganizationWithRelations>(
            `/${id}/with-relations`,
        );
    }

    async create(
        data: CreateVendorOrganizationDto,
    ): Promise<VendorOrganization> {
        return this.post<VendorOrganization>('', data);
    }

    async update(
        id: number,
        data: UpdateVendorOrganizationDto,
    ): Promise<VendorOrganization> {
        return this.patch<VendorOrganization>(`/${id}`, data);
    }

    //   async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    //   }
}

export const vendorOrganizationsService = new VendorOrganizationsService();
