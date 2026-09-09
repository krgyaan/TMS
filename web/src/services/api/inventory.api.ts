import { BaseApiService } from './base.service';
import type { InventoryItem, InventoryTransfer, TransferDTO } from '@/modules/operations/inventory/helpers/inventory.types';

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
}

export const inventoryApi = new InventoryApiService();
