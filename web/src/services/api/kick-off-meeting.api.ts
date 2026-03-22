import type { PaginatedResponse } from '@/types/api.types';
import { BaseApiService } from './base.service';
import type {
    KickOffFilters,
    KickoffMeeting,
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

    async getAll(filters: KickOffFilters): Promise<PaginatedResponse<KickoffMeeting>> {
        return this.getAll(filters);
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
