import { BaseApiService } from './base.service';
import type { InventoryItem, InventoryTransfer, InventoryProjectSummary, InventoryProjectSummaryFilters, TransferDTO } from '@/modules/operations/inventory/helpers/inventory.types';
import type { PaginatedResult } from "@/types/api.types";

class InventoryApiService extends BaseApiService {
    constructor() {
        super('/inventory');
    }

    async getProjectInventory(projectId: number, includeZero = false): Promise<{ items: InventoryItem[] }> {
        const params = new URLSearchParams();
        if (includeZero) params.set('includeZero', 'true');
        const qs = params.toString();
        return this.get(`/project/${projectId}${qs ? `?${qs}` : ''}`);
    }

    async transfer(data: TransferDTO): Promise<InventoryTransfer> {
        return this.post('/transfer', data);
    }

    async getTransfers(fromProject?: number, toProject?: number): Promise<{ items: InventoryTransfer[] }> {
        const params = new URLSearchParams();
        if (fromProject) params.set('fromProject', String(fromProject));
        if (toProject) params.set('toProject', String(toProject));
        const qs = params.toString();
        return this.get(`/transfers${qs ? `?${qs}` : ''}`);
    }

    async getAllInventory(includeZero = false): Promise<{ items: (InventoryItem & { projectName?: string })[] }> {
        const params = new URLSearchParams();
        if (includeZero) params.set('includeZero', 'true');
        const qs = params.toString();
        return this.get(`/all${qs ? `?${qs}` : ''}`);
    }

    async getProjectSummaries(filters?: InventoryProjectSummaryFilters): Promise<PaginatedResult<InventoryProjectSummary>> {
        const searchParams = new URLSearchParams();
        if (filters?.page) searchParams.set('page', String(filters.page));
        if (filters?.limit) searchParams.set('limit', String(filters.limit));
        if (filters?.search) searchParams.set('search', filters.search);
        const qs = searchParams.toString();
        return this.get(`/projects${qs ? `?${qs}` : ''}`);
    }
}

export const inventoryApi = new InventoryApiService();
