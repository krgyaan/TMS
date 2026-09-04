import { BaseApiService } from './base.service';
import type {
    BaseFollowup,
    CreateFollowupRequest,
    FollowupSource,
} from '@/modules/crm/leadfollowup/helpers/leadfollowup.types';

class LeadFollowupsService extends BaseApiService {
    constructor() {
        super('');
    }

    private sourceBase(source: FollowupSource): string {
        if (source.sourceType === 'enquiry') return `/enquiry/followups`;
        return source.sourceType === 'lead'
            ? `/leads/followups`
            : `/happy-calling/followups`;
    }

    async getAll(source: FollowupSource): Promise<BaseFollowup[]> {
        return this.get<BaseFollowup[]>(`${this.sourceBase(source)}/${source.sourceId}`);
    }

    async getById(source: FollowupSource, followupId: number): Promise<BaseFollowup> {
        return this.get<BaseFollowup>(`${this.sourceBase(source)}/${source.sourceId}/${followupId}`);
    }

    async create(source: FollowupSource, data: CreateFollowupRequest): Promise<BaseFollowup> {
        return this.post<BaseFollowup>(`${this.sourceBase(source)}/${source.sourceId}`, data);
    }

    async update(source: FollowupSource, followupId: number, data: CreateFollowupRequest): Promise<BaseFollowup> {
        return this.patch<BaseFollowup>(`${this.sourceBase(source)}/${source.sourceId}/${followupId}`, data);
    }

    async remove(source: FollowupSource, followupId: number): Promise<void> {
        return super.delete<void>(`${this.sourceBase(source)}/${source.sourceId}/${followupId}`);
    }

    async stop(source: FollowupSource, followupId: number, reason?: string): Promise<BaseFollowup> {
        return this.patch<BaseFollowup>(`${this.sourceBase(source)}/${source.sourceId}/${followupId}/stop`, { reason: reason ?? null });
    }
}

export const leadFollowupsService = new LeadFollowupsService();