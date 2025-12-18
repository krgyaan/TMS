import { BaseApiService } from './base.service';
import type {
    VendorGst,
    CreateVendorGstDto,
    UpdateVendorGstDto,
} from '@/types/api.types';

class VendorGstsService extends BaseApiService {
    constructor() {
        super('/vendor-gsts');
    }

    async getAll(): Promise<VendorGst[]> {
        return this.get<VendorGst[]>('');
    }

    async getById(id: number): Promise<VendorGst> {
        return this.get<VendorGst>(`/${id}`);
    }

    async getByOrganization(orgId: number): Promise<VendorGst[]> {
        return this.get<VendorGst[]>(`/organization/${orgId}`);
    }

    async create(data: CreateVendorGstDto): Promise<VendorGst> {
        return this.post<VendorGst>('', data);
    }

    async update(id: number, data: UpdateVendorGstDto): Promise<VendorGst> {
        return this.patch<VendorGst>(`/${id}`, data);
    }

    async deleteItem(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const vendorGstsService = new VendorGstsService();
