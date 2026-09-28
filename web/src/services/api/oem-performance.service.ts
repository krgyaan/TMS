import { BaseApiService } from './base.service';
import type { OemPerformanceParams, OemPerformanceResponse } from '@/modules/performance/oem-dashboard/helpers/oem-performance.types';

class OemPerformanceApiService extends BaseApiService {
    constructor() {
        super('/performance/oem');
    }

    async getReport(params: OemPerformanceParams): Promise<OemPerformanceResponse> {
        const search = new URLSearchParams();
        search.set('oem', String(params.oemId));
        search.set('fromDate', params.fromDate);
        search.set('toDate', params.toDate);

        return this.get<OemPerformanceResponse>(`?${search.toString()}`);
    }
}

export const oemPerformanceService = new OemPerformanceApiService();
