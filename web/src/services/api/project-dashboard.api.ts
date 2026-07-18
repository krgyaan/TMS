import { BaseApiService } from './base.service';

class ProjectDashboardApiService extends BaseApiService {
    constructor() {
        super('/projects');
    }

    // ── Parallel dashboard endpoints ──

    async getOverview(id: number): Promise<{ project: any; tender: any; woBasicDetail: any; woDetail: any; tenderInfoSheet: any }> {
        return this.get(`/${id}/overview`);
    }

    async getWorkOrders(id: number): Promise<{ woBasicDetail: any }> {
        return this.get(`/${id}/work-orders`);
    }

    async getImprests(id: number): Promise<{ imprests: any[]; imprestSum: number }> {
        return this.get(`/${id}/imprests`);
    }
}

export const projectDashboardApi = new ProjectDashboardApiService();
