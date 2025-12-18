import { BaseApiService } from './base.service';
import type {
    VendorAcc,
    CreateVendorAccountDto,
    UpdateVendorAccountDto,
} from '@/types/api.types';

class VendorAccountsService extends BaseApiService {
    constructor() {
        super('/vendor-accounts');
    }

    async getAll(): Promise<VendorAcc[]> {
        return this.get<VendorAcc[]>('');
    }

    async getById(id: number): Promise<VendorAcc> {
        return this.get<VendorAcc>(`/${id}`);
    }

    async getByOrganization(orgId: number): Promise<VendorAcc[]> {
        return this.get<VendorAcc[]>(`/organization/${orgId}`);
    }

    async create(data: CreateVendorAccountDto): Promise<VendorAcc> {
        return this.post<VendorAcc>('', data);
    }

    async update(id: number, data: UpdateVendorAccountDto): Promise<VendorAcc> {
        return this.patch<VendorAcc>(`/${id}`, data);
    }

    async deleteItem(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const vendorAccountsService = new VendorAccountsService();
