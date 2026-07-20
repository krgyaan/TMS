import { BaseApiService } from './base.service';
import type {
    BaseFollowup,
    CreateFollowupRequest,
} from '@/modules/crm/followups/helpers/followup.types';

class FollowupsService extends BaseApiService {
    constructor() {
        super('/leads/followups');
    }

    async getAll(leadId: number): Promise<BaseFollowup[]> {
        return this.get<BaseFollowup[]>(`/${leadId}`);
    }

    async getById(leadId: number, followupId: number): Promise<BaseFollowup> {
        return this.get<BaseFollowup>(`/${leadId}/${followupId}`);
    }

    async create(leadId: number, data: CreateFollowupRequest): Promise<BaseFollowup> {
        return this.post<BaseFollowup>(`/${leadId}`, data);
    }

    // ✅ UPDATED - removed Partial
    async update(leadId: number, followupId: number, data: CreateFollowupRequest): Promise<BaseFollowup> {
        return this.patch<BaseFollowup>(`/${leadId}/${followupId}`, data);
    }

    async remove(leadId: number, followupId: number): Promise<void> {
        return super.delete<void>(`/${leadId}/${followupId}`);
    }
}

export const followupsService = new FollowupsService();