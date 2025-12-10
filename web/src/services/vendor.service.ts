import { BaseApiService } from './base.service';
import type {
    Vendor,
    VendorWithRelations,
    CreateVendorDto,
    UpdateVendorDto
} from '@/types/api.types';

class VendorsService extends BaseApiService {
    constructor() {
        super('/vendors');
    }

    async getAll(): Promise<Vendor[]> {
        return this.get<Vendor[]>('');
    }

    async getById(id: number): Promise<Vendor> {
        return this.get<Vendor>(`/${id}`);
    }

    async getByIdWithRelations(id: number): Promise<VendorWithRelations> {
        return this.get<VendorWithRelations>(`/${id}/with-relations`);
    }

    async getByOrganization(organizationId: number): Promise<Vendor[]> {
        return this.get<Vendor[]>(`/organization/${organizationId}`);
    }

    async create(data: CreateVendorDto): Promise<Vendor> {
        return this.post<Vendor>('', data);
    }

    async update(id: number, data: UpdateVendorDto): Promise<Vendor> {
        return this.patch<Vendor>(`/${id}`, data);
    }

    // async delete(id: number): Promise<void> {
    //     return this.delete<void>(`/${id}`);
    // }
}

export const vendorsService = new VendorsService();
