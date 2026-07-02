import { BaseApiService } from './base.service';
import type { CreateRfqResponseBodyDto, RfqResponseListItem, RfqResponseDetail } from '@/modules/tendering/rfq-response/helpers/rfqResponse.types';

class RfqResponseApiService extends BaseApiService {
    constructor() {
        super('/rfqs');
    }

    async createRfqResponse(rfqId: number, data: CreateRfqResponseBodyDto): Promise<{ id: number; rfqId: number; vendorId: number }> {
        return this.post<{ id: number; rfqId: number; vendorId: number }>(`/${rfqId}/responses`, data);
    }

    async getAllResponses(): Promise<RfqResponseListItem[]> {
        return this.get<RfqResponseListItem[]>('/responses');
    }

    async getResponsesByRfqId(rfqId: number): Promise<RfqResponseListItem[]> {
        return this.get<RfqResponseListItem[]>(`/${rfqId}/responses`);
    }

    async getResponseById(responseId: number): Promise<RfqResponseDetail> {
        return this.get<RfqResponseDetail>(`/responses/${responseId}`);
    }
}

export const rfqResponseService = new RfqResponseApiService();
