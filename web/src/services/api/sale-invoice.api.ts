import { BaseApiService } from './base.service';
import type { CreateSaleInvoiceDTO } from '@/modules/operations/sale-invoices/helpers/saleInvoice.types';
import axiosInstance from '@/lib/axios';

class SaleInvoiceApiService extends BaseApiService {
    constructor() {
        super('/sale-invoices');
    }

    async getWoBillingData(projectId: number): Promise<any> {
        return this.get(`/wo-billing-data/${projectId}`);
    }

    async createSaleInvoice(data: CreateSaleInvoiceDTO): Promise<any> {
        return this.post('/', data);
    }

    async getProjectSaleInvoices(projectId: number): Promise<{ saleInvoices: any[] }> {
        return this.get(`/project/${projectId}`);
    }

    async getAllSaleInvoices(): Promise<{ saleInvoices: any[] }> {
        return this.get('/');
    }

    async getSaleInvoiceById(id: number): Promise<any> {
        return this.get(`/${id}`);
    }

    async updateSaleInvoiceStatus(id: number, data: { status: string; invoiceDocPaths?: string[] }): Promise<any> {
        return this.patch(`/${id}/status`, data);
    }

    async updateSaleInvoice(id: number, data: Record<string, any>): Promise<any> {
        return this.patch(`/${id}`, data);
    }

    async createDraft(id: number): Promise<any> {
        return this.post(`/${id}/create-draft`, {});
    }

    async approve(id: number): Promise<any> {
        return this.post(`/${id}/approve`, {});
    }

    async requestChanges(id: number, remark: string): Promise<any> {
        return this.post(`/${id}/request-changes`, { remark });
    }

    async reject(id: number, remark: string): Promise<any> {
        return this.post(`/${id}/reject`, { remark });
    }

    async finalize(id: number): Promise<any> {
        return this.post(`/${id}/finalize`, {});
    }

    getSaleInvoicePdfUrl(id: number, version?: string): string {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        let url = `${baseUrl}/sale-invoices/${id}/pdf`;
        if (version) url += `?version=${encodeURIComponent(version)}`;
        return url;
    }

    async getPdfVersions(id: number): Promise<Record<string, { path: string; hash: string }>> {
        return this.get(`/${id}/pdf/versions`);
    }

    async deletePdfVersion(id: number, version: string): Promise<void> {
        return this.delete(`/${id}/pdf/versions/${encodeURIComponent(version)}`);
    }
}

export const saleInvoiceApi = new SaleInvoiceApiService();