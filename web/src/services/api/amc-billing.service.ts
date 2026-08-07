import { BaseApiService } from "./base.service";
import type { AmcBillDetail } from "@/modules/services/amc/helpers/amc.types";

class AmcBillingService extends BaseApiService {
    constructor() {
        super("/amc-billing");
    }

    async getAll(amcId?: number): Promise<AmcBillDetail[]> {
        return this.get<AmcBillDetail[]>(`/bills${amcId ? `?amcId=${amcId}` : ""}`);
    }

    async getById(id: number): Promise<AmcBillDetail> {
        return this.get<AmcBillDetail>(`/bills/${id}`);
    }

    async addInvoices(id: number, paths: string[]): Promise<AmcBillDetail> {
        return this.post<AmcBillDetail>(`/bills/${id}/invoices`, { paths });
    }

    async addReceipts(id: number, paths: string[]): Promise<AmcBillDetail> {
        return this.post<AmcBillDetail>(`/bills/${id}/receipts`, { paths });
    }

    async removeInvoice(id: number, index: number): Promise<AmcBillDetail> {
        return this.delete<AmcBillDetail>(`/bills/${id}/invoices/${index}`);
    }

    async removeReceipt(id: number, index: number): Promise<AmcBillDetail> {
        return this.delete<AmcBillDetail>(`/bills/${id}/receipts/${index}`);
    }

    async followup(id: number): Promise<AmcBillDetail> {
        return this.post<AmcBillDetail>(`/bills/${id}/followup`, {});
    }
}

export const amcBillingService = new AmcBillingService();