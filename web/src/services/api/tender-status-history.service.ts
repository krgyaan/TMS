import { BaseApiService } from './base.service';
import type { TenderStatusHistoryEntry } from '@/modules/tendering/tenders/helpers/tenderInfo.types';

class TenderStatusHistoryService extends BaseApiService {
    constructor() {
        super('/tender-status-history');
    }

    async getByTender(tenderId: number): Promise<TenderStatusHistoryEntry[]> {
        const data = await this.get<unknown>(`/${tenderId}`);
        return Array.isArray(data) ? (data as TenderStatusHistoryEntry[]) : [];
    }
}

export const tenderStatusHistoryService = new TenderStatusHistoryService();
