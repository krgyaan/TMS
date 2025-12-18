import { BaseApiService } from './base.service';
import type {
    VendorFile,
    CreateVendorFileDto,
    UpdateVendorFileDto,
} from '@/types/api.types';

class VendorFilesService extends BaseApiService {
    constructor() {
        super('/vendor-files');
    }

    async getAll(): Promise<VendorFile[]> {
        return this.get<VendorFile[]>('');
    }

    async getById(id: number): Promise<VendorFile> {
        return this.get<VendorFile>(`/${id}`);
    }

    async getByVendor(vendorId: number): Promise<VendorFile[]> {
        return this.get<VendorFile[]>(`/vendor/${vendorId}`);
    }

    async create(data: CreateVendorFileDto): Promise<VendorFile> {
        return this.post<VendorFile>('', data);
    }

    async update(id: number, data: UpdateVendorFileDto): Promise<VendorFile> {
        return this.patch<VendorFile>(`/${id}`, data);
    }

    async deleteItem(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const vendorFilesService = new VendorFilesService();
