import { BaseApiService } from './base.service';
import axiosInstance from '@/lib/axios';
import type {
    CreatePurchaseOrderDTO,
    UpdatePurchaseOrderDTO,
    CreatePartyDTO,
    PurchaseOrderRow,
} from '@/modules/operations/project-dashboard/helpers/projectDashboard.types';

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

    async getProjectPurchaseOrders(id: number): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        return this.get(`/${id}/purchase-orders`);
    }

    async getImprests(id: number): Promise<{ imprests: any[]; imprestSum: number }> {
        return this.get(`/${id}/imprests`);
    }

    async getPoParties(): Promise<any> {
        return this.get('/purchase-orders/parties');
    }

    async getNextPONumber(projectName: string): Promise<string> {
        return this.get(`/purchase-orders/next-number?projectName=${encodeURIComponent(projectName)}`);
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

    getPurchaseOrderPdfUrl(id: number, version?: string): string {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        let url = `${baseUrl}/projects/purchase-orders/${id}/pdf`;
        if (version) url += `?version=${encodeURIComponent(version)}`;
        return url;
    }

    async getAllPurchaseOrders(): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        return this.get('/purchase-orders');
    }

    async getPurchaseOrderPdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        return this.get(`/purchase-orders/${id}/pdf/versions`);
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        return this.delete(`/purchase-orders/${id}/pdf/versions/${encodeURIComponent(version)}`);
    }

    async updatePurchaseOrder(id: number, data: UpdatePurchaseOrderDTO): Promise<any> {
        return this.put(`/purchase-orders/${id}`, data);
    }
}

export const projectDashboardApi = new ProjectDashboardApiService();
