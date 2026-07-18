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
}

export const saleInvoiceApi = new SaleInvoiceApiService();
