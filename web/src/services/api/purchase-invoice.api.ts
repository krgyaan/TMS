import { BaseApiService } from "./base.service";

class PurchaseInvoiceApiService extends BaseApiService {
    constructor() {
        super("/project-purchase-invoices");
    }

    async getAll() {
        return this.get<any[]>("/");
    }

    async getById(id: number) {
        return this.get<any>(`/${id}`);
    }

    async getByProject(projectId: number) {
        return this.get<any[]>(`/project/${projectId}`);
    }

    async create(data: any) {
        return this.post<any>("/", data);
    }

    async update(id: number, data: any) {
        return this.put<any>(`/${id}`, data);
    }
}

export const purchaseInvoiceApi = new PurchaseInvoiceApiService();
