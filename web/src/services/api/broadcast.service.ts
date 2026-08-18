import { BaseApiService } from './base.service';
import type { BroadcastRow } from '@/modules/crm/happy-calling/helpers/happy-calling.types';

class BroadcastService extends BaseApiService {
    constructor() {
        super('/broadcasts');
    }

    async getAll(): Promise<BroadcastRow[]> {
        return this.get<BroadcastRow[]>('');
    }

    async getById(id: number): Promise<BroadcastRow> {
        return this.get<BroadcastRow>(`/${id}`);
    }

    async create(data: { name: string }): Promise<BroadcastRow> {
        return this.post<BroadcastRow>('', data);
    }
}

export const broadcastService = new BroadcastService();