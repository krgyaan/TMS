import { BaseApiService } from './base.service';
import type {
    RaDashboardCounts,
    RaDashboardResponse,
    ReverseAuction,
    ScheduleRaDto,
    UploadRaResultDto,
    RaDashboardListParams,
} from '@/modules/tendering/ras/helpers/reverseAuction.types';

class ReverseAuctionService extends BaseApiService {
    constructor() {
        super('/reverse-auctions');
    }

    async getDashboard(
        filters?: RaDashboardListParams
    ): Promise<RaDashboardResponse> {
        const search = new URLSearchParams();

        if (filters) {
            if (filters.tabKey) {
                search.set('tabKey', filters.tabKey);
            }
            if (filters.page) {
                search.set('page', String(filters.page));
            }
            if (filters.limit) {
                search.set('limit', String(filters.limit));
            }
            if (filters.sortBy) {
                search.set('sortBy', filters.sortBy);
            }
            if (filters.sortOrder) {
                search.set('sortOrder', filters.sortOrder);
            }
            if (filters.search) {
                search.set('search', filters.search);
            }
        }

        const queryString = search.toString();
        return this.get<RaDashboardResponse>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(): Promise<RaDashboardCounts> {
        return this.get<RaDashboardCounts>('/dashboard/counts');
    }

    async getById(id: number): Promise<ReverseAuction> {
        return this.get<ReverseAuction>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<ReverseAuction> {
        return this.get<ReverseAuction>(`/tender/${tenderId}`);
    }

    async scheduleRa(id: number, data: ScheduleRaDto): Promise<ReverseAuction> {
        return this.patch<ReverseAuction>(`/${id}/schedule`, data);
    }

    async uploadResult(id: number, data: UploadRaResultDto): Promise<ReverseAuction> {
        return this.patch<ReverseAuction>(`/${id}/upload-result`, data);
    }
}

export const reverseAuctionService = new ReverseAuctionService();
