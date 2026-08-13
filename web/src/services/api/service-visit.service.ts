import { BaseApiService } from "./base.service";
import type {
    ServiceVisitReport,
    ServiceVisitListItemWithReport,
    CreateServiceVisitReportDto,
    UpdateServiceVisitReportDto,
} from "@/modules/services/visit/helpers/service-visit.types";

class ServiceVisitService extends BaseApiService {
    constructor() {
        super("/service-visit");
    }

    async getAll(complaintId?: number): Promise<ServiceVisitReport[]> {
        return this.get<ServiceVisitReport[]>(complaintId ? `?complaintId=${complaintId}` : "");
    }

    async getList(): Promise<ServiceVisitListItemWithReport[]> {
        const raw = await this.get<ServiceVisitListItemWithReport[]>("/list");
        return raw.map(row => ({
            ...row,
            hasReport: !!row.reportId,
        }));
    }

    async getById(id: number): Promise<ServiceVisitReport> {
        return this.get<ServiceVisitReport>(`/${id}`);
    }

    async getByComplaintId(complaintId: number): Promise<ServiceVisitReport | null> {
        return this.get<ServiceVisitReport | null>(`/complaint/${complaintId}`);
    }

    async create(data: CreateServiceVisitReportDto): Promise<ServiceVisitReport> {
        return this.post<ServiceVisitReport>("", data);
    }

    async update(id: number, data: UpdateServiceVisitReportDto): Promise<ServiceVisitReport> {
        return this.put<ServiceVisitReport>(`/${id}`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${id}`);
    }
}

export const serviceVisitService = new ServiceVisitService();
