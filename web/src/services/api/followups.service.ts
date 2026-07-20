import { BaseApiService } from './base.service';
import type {
    BaseFollowup,
    CreateFollowupRequest,
} from '@/modules/crm/followups/helpers/followup.types';

class FollowupsService extends BaseApiService {
    constructor() {
        super('/leads/followups');
    }

    /**
     * Get all followups for a lead
     * GET /leads/followups/:leadId
     */
    async getAll(leadId: number): Promise<BaseFollowup[]> {
        return this.get<BaseFollowup[]>(`/${leadId}`);
    }

    /**
     * Get single followup
     * GET /leads/followups/:leadId/:followupId
     */
    async getById(leadId: number, followupId: number): Promise<BaseFollowup> {
        return this.get<BaseFollowup>(`/${leadId}/${followupId}`);
    }

    /**
     * Create new followup
     * POST /leads/followups/:leadId
     */
    async create(leadId: number, data: CreateFollowupRequest): Promise<BaseFollowup> {
        return this.post<BaseFollowup>(`/${leadId}`, data);
    }

    /**
     * Delete followup
     * DELETE /leads/followups/:leadId/:followupId
     */
    async remove(leadId: number, followupId: number): Promise<void> {
        return super.delete<void>(`/${leadId}/${followupId}`);
    }
}

export const followupsService = new FollowupsService();