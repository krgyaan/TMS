import { BaseApiService } from './base.service';
import type { ProjectMasterListRow } from "@/modules/shared/master-project/helpers/projectMaster.types";
import type { PaginatedResult } from "@/types/api.types";

export interface ProjectListFilters {
    page?: number;
    limit?: number;
    search?: string;
    teamName?: string;
}

class ProjectDashboardApiService extends BaseApiService {
    constructor() {
        super('/projects');
    }

    // ── Parallel dashboard endpoints ──

    async getOverview(id: number): Promise<{ project: any; tender: any; woBasicDetail: any; woDetail: any; tenderInfoSheet: any }> {
        return this.get(`/${id}/overview`);
    }

    async getWorkOrders(id: number): Promise<{ woBasicDetail: any }> {
        return this.get(`/${id}/work-orders`);
    }

    async getImprests(id: number): Promise<{ imprests: any[]; imprestSum: number }> {
        return this.get(`/${id}/imprests`);
    }

    // ── Project list endpoint ──

    async getList(params?: ProjectListFilters): Promise<PaginatedResult<ProjectMasterListRow>> {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.search) searchParams.set("search", params.search);
        if (params?.teamName) searchParams.set("teamName", params.teamName);

        const queryString = searchParams.toString();
        return this.get<PaginatedResult<ProjectMasterListRow>>(`/list${queryString ? `?${queryString}` : ""}`);
    }
}

export const projectDashboardApi = new ProjectDashboardApiService();
