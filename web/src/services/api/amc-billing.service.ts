import { BaseApiService } from "./base.service";
import type {
    AmcBilling,
    BillingPathField,
} from "@/modules/services/amc-billing/helpers/amc-billing.types";

class AmcBillingService extends BaseApiService {
    constructor() {
        super("/amc-billing");
    }

    async getAll(amcId?: number): Promise<AmcBilling[]> {
        return this.get<AmcBilling[]>(amcId ? `?amcId=${amcId}` : "");
    }

    async getById(id: number): Promise<AmcBilling> {
        return this.get<AmcBilling>(`/${id}`);
    }

    async uploadFile(id: number, field: BillingPathField, file: File): Promise<AmcBilling> {
        const formData = new FormData();
        formData.append("file", file);
        return this.post<AmcBilling>(`/${id}/upload/${field}`, formData);
    }
}

export const amcBillingService = new AmcBillingService();
