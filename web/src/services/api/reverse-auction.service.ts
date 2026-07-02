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
            if (filters.teamId !== undefined && filters.teamId !== null) {
                search.set('teamId', String(filters.teamId));
            }
        }

        const queryString = search.toString();
        return this.get<RaDashboardResponse>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(teamId?: number): Promise<RaDashboardCounts> {
        const params = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            params.append('teamId', teamId.toString());
        }
        const query = params.toString();
        return this.get<RaDashboardCounts>(query ? `/dashboard/counts?${query}` : '/dashboard/counts');
    }

    async getById(id: number): Promise<ReverseAuction> {
        return this.get<ReverseAuction>(`/${id}`);
    }

    async getByTenderId(tenderId: number): Promise<ReverseAuction> {
        return this.get<ReverseAuction>(`/tender/${tenderId}`);
    }

    async scheduleRa(tenderId: number, data: ScheduleRaDto): Promise<ReverseAuction> {
        return this.post<ReverseAuction>(`/${tenderId}/schedule`, data);
    }

    async uploadResult(raId: number, data: UploadRaResultDto): Promise<ReverseAuction> {
        return this.patch<ReverseAuction>(`/${raId}/upload-result`, data);
    }
}

export const reverseAuctionService = new ReverseAuctionService();
