import { BaseApiService } from './base.service';
import type { CreateImprestCreditPayload, EmployeeImprestSummary } from '@/modules/imprest/helpers/imprest-admin.types';
import type {
    EmployeeImprestDashboard,
    EmployeeImprestTransactionRow,
    ImprestPaymentHistoryRow,
    ImprestRow,
    ImprestVoucherRow,
    ImprestVoucherView,
} from '@/modules/imprest/helpers/imprest.types';

class ImprestService extends BaseApiService {
    constructor() {
        super('/imprest');
    }

    async getMyDashboard(params?: { page?: number; limit?: number; search?: string }): Promise<EmployeeImprestDashboard> {
        return this.get<EmployeeImprestDashboard>(`/employee${this.buildQuery(params)}`);
    }

    async getUserDashboard(userId: number, params?: { page?: number; limit?: number; search?: string }): Promise<EmployeeImprestDashboard> {
        return this.get<EmployeeImprestDashboard>(`/employee/user/${userId}${this.buildQuery(params)}`);
    }

    private buildQuery(params?: { page?: number; limit?: number; search?: string }): string {
        if (!params) return "";
        const search = new URLSearchParams();
        if (params.page !== undefined) search.set("page", String(params.page));
        if (params.limit !== undefined) search.set("limit", String(params.limit));
        if (params.search) search.set("search", params.search);
        const qs = search.toString();
        return qs ? `?${qs}` : "";
    }

    async getMyTransactions(): Promise<EmployeeImprestTransactionRow[]> {
        return this.get<EmployeeImprestTransactionRow[]>('/employee/transactions');
    }

    async getUserTransactions(userId: number): Promise<EmployeeImprestTransactionRow[]> {
        return this.get<EmployeeImprestTransactionRow[]>(`/employee/user/${userId}/transactions`);
    }

    async create({ data, files }: { data: Record<string, unknown>; files: File[] }): Promise<ImprestRow> {
        const formData = new FormData();

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        });

        files.forEach(file => formData.append('files', file));

        return this.post<ImprestRow>('/employee', formData);
    }

    async update(id: number, data: Partial<ImprestRow>): Promise<ImprestRow> {
        return this.patch<ImprestRow>(`/employee/${id}`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return super.delete<{ success: boolean }>(`/employee/${id}`);
    }

    async getById(id: number): Promise<ImprestRow> {
        return this.get<ImprestRow>(`/employee/${id}`);
    }

    async approveToggle(id: number): Promise<unknown> {
        return this.post(`/employee/${id}/approve`);
    }

    async tallyToggle(id: number): Promise<unknown> {
        return this.post(`/employee/${id}/tally`);
    }

    async proofToggle(id: number): Promise<unknown> {
        return this.post(`/employee/${id}/proof-approve`);
    }

    async addAccRemark(id: number, remark: string): Promise<unknown> {
        return this.patch(`/employee/${id}/account-remark`, { remark });
    }

    async uploadProofs(id: number, files: File[]): Promise<unknown> {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        return this.post(`/employee/${id}/upload`, formData);
    }

    async deleteProof(id: number, filename: string): Promise<unknown> {
        return super.delete(`/employee/${id}/proof/${encodeURIComponent(filename)}`);
    }

    async getSummary(): Promise<EmployeeImprestSummary[]> {
        return this.get<EmployeeImprestSummary[]>('');
    }

    async getVouchers(params?: { userId?: number }): Promise<ImprestVoucherRow[]> {
        const search = new URLSearchParams();
        if (params?.userId !== undefined && params?.userId !== null) {
            search.set('userId', String(params.userId));
        }
        const queryString = search.toString();
        return this.get<ImprestVoucherRow[]>(queryString ? `/voucher?${queryString}` : '/voucher');
    }

    async getVoucherView(params: { userId: number; from: string; to: string }): Promise<ImprestVoucherView> {
        const search = new URLSearchParams();
        search.set('userId', String(params.userId));
        search.set('from', params.from);
        search.set('to', params.to);
        return this.get<ImprestVoucherView>(`/voucher/view?${search.toString()}`);
    }

    async getVoucherProofs(params: { userId: number; year: number; week: number }): Promise<unknown> {
        const search = new URLSearchParams();
        search.set('userId', String(params.userId));
        search.set('year', String(params.year));
        search.set('week', String(params.week));
        return this.get<unknown>(`/voucher/proofs?${search.toString()}`);
    }

    async accountApproveVoucher(payload: { id: number; remark?: string; approve: boolean }): Promise<unknown> {
        const { id, ...body } = payload;
        return this.post(`/voucher/${id}/account-approve`, body);
    }

    async adminApproveVoucher(payload: { id: number; remark?: string; approve: boolean }): Promise<unknown> {
        const { id, ...body } = payload;
        return this.post(`/voucher/${id}/admin-approve`, body);
    }

    async getPaymentHistory(userId?: number): Promise<ImprestPaymentHistoryRow[]> {
        const search = new URLSearchParams();
        if (userId !== undefined && userId !== null) {
            search.set('userId', String(userId));
        }
        const queryString = search.toString();
        const data = await this.get<unknown>(queryString ? `/payment-history?${queryString}` : '/payment-history');
        return Array.isArray((data as { data?: ImprestPaymentHistoryRow[] })?.data)
            ? (data as { data: ImprestPaymentHistoryRow[] }).data
            : [];
    }

    async deletePaymentHistory(id: number): Promise<{ success: boolean }> {
        return super.delete<{ success: boolean }>(`/payment-history/${id}`);
    }

    async credit(data: CreateImprestCreditPayload): Promise<{ success: boolean }> {
        return this.post<{ success: boolean }>('/credit', data);
    }
}

export const imprestService = new ImprestService();
