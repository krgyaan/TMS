import { BaseApiService } from './base.service';
import type {
    CreatePurchaseOrderDTO,
    UpdatePurchaseOrderDTO,
    CreatePartyDTO,
    PurchaseOrderRow,
    SetTdsDTO,
    SellerOption,
    SellerPersonOption,
    ShipToOption,
} from '@/modules/operations/purchase-orders/helpers/purchaseOrder.types';
import axiosInstance from '@/lib/axios';

const buildPickerQuery = (q?: string, ids?: number[], limit?: number): string => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (ids?.length) params.set('ids', ids.join(','));
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

class PurchaseOrderApiService extends BaseApiService {
    constructor() {
        super('/purchase-orders');
    }

    async getProjectPurchaseOrders(projectId: number): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        return this.get(`/project/${projectId}`);
    }

    async getProjectInventory(projectId: number): Promise<{ items: any[] }> {
        return this.get(`/project/${projectId}/inventory`);
    }

    async getPoParties(): Promise<any> {
        return this.get('/parties');
    }

    // Both pickers are server-paged: `q` narrows, `ids` guarantees the rows a
    // form has already selected stay in the response (otherwise the combobox
    // loses its own label once the query stops matching it), `limit` caps the
    // first page so mounting a form never downloads the whole table.
    async getSellerOptions(q?: string, ids?: number[], limit?: number): Promise<SellerOption[]> {
        return this.get(`/parties/sellers${buildPickerQuery(q, ids, limit)}`);
    }

    async getSellerPersons(orgId: number): Promise<SellerPersonOption[]> {
        return this.get(`/parties/sellers/${orgId}/persons`);
    }

    async getShipToOptions(q?: string, ids?: number[], limit?: number): Promise<ShipToOption[]> {
        return this.get(`/parties/ship-to${buildPickerQuery(q, ids, limit)}`);
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

    async activateParty(id: number, source?: string): Promise<any> {
        const qs = source ? `?source=${encodeURIComponent(source)}` : "";
        return this.patch(`/parties/${id}/activate${qs}`);
    }

    async deactivateParty(id: number, source?: string): Promise<any> {
        const qs = source ? `?source=${encodeURIComponent(source)}` : "";
        return this.patch(`/parties/${id}/deactivate${qs}`);
    }

    async updateParty(id: number, data: Partial<CreatePartyDTO> & { source?: string }): Promise<any> {
        return this.patch(`/parties/${id}`, data);
    }

    async getPurchaseOrder(id: number): Promise<any> {
        return this.get(`/${id}`);
    }

    async getClosureData(id: number): Promise<any> {
        return this.get(`/${id}/closure`);
    }

    async bulkCreatePaymentRequests(id: number, items: any[]): Promise<any> {
        return this.post(`/${id}/bulk-payment-requests`, { items });
    }

    async bulkCreatePurchaseInvoices(id: number, items: any[]): Promise<any> {
        return this.post(`/${id}/bulk-purchase-invoices`, { items });
    }

    async updatePaymentRequest(poId: number, prId: number, data: any): Promise<any> {
        return this.put(`/${poId}/payment-requests/${prId}`, data);
    }

    async deletePaymentRequest(poId: number, prId: number): Promise<any> {
        return this.delete(`/${poId}/payment-requests/${prId}`);
    }

    async updatePurchaseInvoice(poId: number, piId: number, data: any): Promise<any> {
        return this.put(`/${poId}/purchase-invoices/${piId}`, data);
    }

    async deletePurchaseInvoice(poId: number, piId: number): Promise<any> {
        return this.delete(`/${poId}/purchase-invoices/${piId}`);
    }

    getPurchaseOrderPdfUrl(id: number, version?: string): string {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        let url = `${baseUrl}/purchase-orders/${id}/pdf`;
        if (version) url += `?version=${encodeURIComponent(version)}`;
        return url;
    }

    async getApprovalCounts(section?: string): Promise<{ pending: number; approved: number; rejected: number; new: number; closed: number; invoicePending: number }> {
        const searchParams = new URLSearchParams();
        if (section) searchParams.set('section', section);
        const qs = searchParams.toString();
        return this.get(`/approval-counts${qs ? `?${qs}` : ''}`);
    }

    async getAllPurchaseOrders(status?: string, section?: string): Promise<{ purchaseOrders: PurchaseOrderRow[] }> {
        const searchParams = new URLSearchParams();
        if (status) searchParams.set('status', status);
        if (section) searchParams.set('section', section);
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

    async getClosureStatus(id: number): Promise<any> {
        return this.get(`/${id}/closure-status`);
    }

    async close(id: number, closureNote: string): Promise<void> {
        return this.post(`/${id}/close`, { closureNote });
    }
}

export const purchaseOrderApi = new PurchaseOrderApiService();
