import { BaseApiService } from "./base.service";

class PaymentRequestApiService extends BaseApiService {
    constructor() {
        super("/payment-requests");
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

    async getNextNumber(projectName?: string) {
        const params = projectName ? `?projectName=${encodeURIComponent(projectName)}` : "";
        return this.get<string>(`/next-number${params}`);
    }
}

export const paymentRequestApi = new PaymentRequestApiService();
