import { BaseApiService } from './base.service';
import type {
    CreatePurchaseOrderDTO,
    UpdatePurchaseOrderDTO,
    CreatePartyDTO,
} from '@/modules/operations/project-dashboard/helpers/projectDashboard.types';
import type { ProjectDashboardResponse } from '@/modules/operations/project-dashboard/helpers/projectDashboard.types';

class ProjectDashboardApiService extends BaseApiService {
    constructor() {
        super('/projects');
    }

    async getDashboardDetails(id: number): Promise<ProjectDashboardResponse> {
        return this.get(`/details/${id}`);
    }

    async getPoParties(): Promise<any> {
        return this.get('/purchase-orders/parties');
    }

    async createPurchaseOrder(data: CreatePurchaseOrderDTO): Promise<any> {
        return this.post('/purchase-orders', data);
    }

    async createParty(data: CreatePartyDTO): Promise<any> {
        return this.post('/purchase-orders/parties', data);
    }

    async getPurchaseOrder(id: number): Promise<any> {
        return this.get(`/purchase-orders/${id}`);
    }

    async updatePurchaseOrder(id: number, data: UpdatePurchaseOrderDTO): Promise<any> {
        return this.put(`/purchase-orders/${id}`, data);
    }
}

export const projectDashboardApi = new ProjectDashboardApiService();
