import type { PaginatedResponse } from '@/types/api.types';
import { BaseApiService } from './base.service';
import type {
    KickOffFilters,
    KickoffMeeting,
    KickoffMeetingCount,
    SaveKickoffMeetingDto,
    UpdateKickoffMeetingMomDto
} from '@/modules/operations/types/wo.types';

class KickOffMeetingApiService extends BaseApiService {
    constructor() {
        super('/kick-off-meeting');
    }

    async getOne(id: number): Promise<KickoffMeeting> {
        return this.get(`/${id}`);
    }

    async getAll(params: KickOffFilters, teamId?: number): Promise<PaginatedResponse<KickoffMeeting>> {
        const search = new URLSearchParams();

        if (params) {
            if (params.tab) {
                search.set('tab', String(params.tab));
            }
            if (params.page) {
                search.set('page', String(params.page));
            }
            if (params.limit) {
                search.set('limit', String(params.limit));
            }
            if (params.sortBy) {
                search.set('sortBy', params.sortBy);
            }
            if (params.sortOrder) {
                search.set('sortOrder', params.sortOrder);
            }
            if (params.search) {
                search.set('search', params.search);
            }
        }
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }

        const queryString = search.toString();
        return this.get<PaginatedResponse<KickoffMeeting>>(queryString ? `/dashboard?${queryString}` : '/dashboard');
    }

    async getDashboardCounts(teamId?: number) {
        const search = new URLSearchParams();
        if (teamId !== undefined && teamId !== null) {
            search.set('teamId', String(teamId));
        }
        const queryString = search.toString();
        return this.get<KickoffMeetingCount>(queryString ? `/dashboard/counts?${queryString}` : '/dashboard/counts');
    }

    async getByWoDetailId(woDetailId: number): Promise<KickoffMeeting | null> {
        return this.get<KickoffMeeting>(`/wo-detail/${woDetailId}`);
    }

    async saveMeeting(data: SaveKickoffMeetingDto): Promise<KickoffMeeting> {
        return this.post<KickoffMeeting>('', data);
    }

    async updateMom(id: number, data: UpdateKickoffMeetingMomDto): Promise<KickoffMeeting> {
        return this.patch<KickoffMeeting>(`/${id}/mom`, data);
    }
}

export const kickOffMeetingApi = new KickOffMeetingApiService();
