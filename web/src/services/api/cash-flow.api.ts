import { BaseApiService } from "./base.service";

class CashFlowApiService extends BaseApiService {
    constructor() {
        super("/cash-flows");
    }

    async getByProject(projectId: number) {
        return this.get<any[]>(`/project/${projectId}`);
    }

    async getSummary(projectId: number) {
        return this.get<{
            totalInflow: number;
            totalOutflow: number;
            totalTds: number;
            totalGst: number;
            netCashFlow: number;
        }>(`/project/${projectId}/summary`);
    }
}

export const cashFlowApi = new CashFlowApiService();