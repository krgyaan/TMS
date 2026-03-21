import { BaseApiService } from './base.service';
import type {
    KickoffMeeting,
    SaveKickoffMeetingDto,
    UpdateKickoffMeetingMomDto
} from '@/modules/operations/types/wo.types';

class KickOffMeetingApiService extends BaseApiService {
    constructor() {
        super('/kick-off-meeting');
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
