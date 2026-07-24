import { BaseApiService } from './base.service';
import type {
    CreatePurchaseOrderDTO,
    UpdatePurchaseOrderDTO,
    CreatePartyDTO,
    PurchaseOrderRow,
    SetTdsDTO,
} from '@/modules/operations/purchase-orders/helpers/purchaseOrder.types';
import axiosInstance from '@/lib/axios';

class PurchaseOrderApiService extends BaseApiService {
    constructor() {
        super('/purchase-orders');
    }

    async getProjectPurchaseOrders(projectId: number): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        return this.get(`/project/${projectId}`);
    }

    async getPoParties(): Promise<any> {
        return this.get('/parties');
    }

    async getNextPONumber(projectName: string): Promise<string> {
        return this.get(`/next-number?projectName=${encodeURIComponent(projectName)}`);
    }

    async createPurchaseOrder(data: CreatePurchaseOrderDTO): Promise<any> {
        return this.post('', data);
    }

    async createParty(data: CreatePartyDTO): Promise<any> {
        return this.post('/parties', data);
    }

    async getPurchaseOrder(id: number): Promise<any> {
        return this.get(`/${id}`);
    }

    getPurchaseOrderPdfUrl(id: number, version?: string): string {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        let url = `${baseUrl}/purchase-orders/${id}/pdf`;
        if (version) url += `?version=${encodeURIComponent(version)}`;
        return url;
    }

    async getApprovalCounts(teamId?: number): Promise<{ pending: number; approved: number; rejected: number }> {
        const searchParams = new URLSearchParams();
        if (teamId) searchParams.set('teamId', String(teamId));
        const qs = searchParams.toString();
        return this.get(`/approval-counts${qs ? `?${qs}` : ''}`);
    }

    async getAllPurchaseOrders(teamId?: number, status?: string): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        const searchParams = new URLSearchParams();
        if (teamId) searchParams.set('teamId', String(teamId));
        if (status) searchParams.set('status', status);
        const qs = searchParams.toString();
        return this.get(`/${qs ? `?${qs}` : ''}`);
    }

    async getPurchaseOrderPdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        return this.get(`/${id}/pdf/versions`);
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        return this.delete(`/${id}/pdf/versions/${encodeURIComponent(version)}`);
    }

    async setTdsPercentage(id: number, data: SetTdsDTO): Promise<any> {
        return this.put(`/${id}/tds`, data);
    }

    async updatePurchaseOrder(id: number, data: UpdatePurchaseOrderDTO): Promise<any> {
        return this.put(`/${id}`, data);
    }
}

export const purchaseOrderApi = new PurchaseOrderApiService();
