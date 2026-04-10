import { BaseApiService } from './base.service';
import type { WoAcceptanceDecisionDto } from '@/modules/operations/types/wo.types';

class WoAcceptanceService extends BaseApiService {
  constructor() {
    super('/wo-acceptance');
  }

  async getDetails(woDetailId: number): Promise<any> {
    return this.get(`/${woDetailId}`);
  }

  async submitDecision(woDetailId: number, data: WoAcceptanceDecisionDto): Promise<any> {
    return this.post(`/${woDetailId}/decision`, data);
  }
}

export const woAcceptanceService = new WoAcceptanceService();
