import { BaseApiService } from "./base.service";

class PaymentRequestApiService extends BaseApiService {
    constructor() {
        super("/project-payment-requests");
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

    // ── Beneficiary endpoints ──

    async getBeneficiaries() {
        return this.get<any[]>("/beneficiaries");
    }

    async createBeneficiary(data: any) {
        return this.post<any>("/beneficiaries", data);
    }

    async getBeneficiary(id: number) {
        return this.get<any>(`/beneficiaries/${id}`);
    }

    async updateBeneficiary(id: number, data: any) {
        return this.put<any>(`/beneficiaries/${id}`, data);
    }
}

export const paymentRequestApi = new PaymentRequestApiService();
