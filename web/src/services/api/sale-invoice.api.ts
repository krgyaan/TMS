import { BaseApiService } from './base.service';
import type { CreateSaleInvoiceDTO } from '@/modules/operations/sale-invoices/helpers/saleInvoice.types';

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
}

export const saleInvoiceApi = new SaleInvoiceApiService();
