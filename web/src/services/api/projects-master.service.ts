import { BaseApiService } from "./base.service";
import type {
    ProjectMasterListParams,
    ProjectMasterListRow,
    ProjectMasterResponse,
    CreateProjectMasterDto,
    UpdateProjectMasterDto,
} from "@/modules/shared/master-project/helpers/projectMaster.types";
import type { PaginatedResult } from "@/types/api.types";

class ProjectMasterService extends BaseApiService {
    constructor() {
        super("/document-dashboard/projects");
    }

    async getAll(params?: ProjectMasterListParams): Promise<PaginatedResult<ProjectMasterListRow>> {
        const search = new URLSearchParams();

        if (params?.page) search.set("page", String(params.page));
        if (params?.limit) search.set("limit", String(params.limit));
        if (params?.sortBy) search.set("sortBy", params.sortBy);
        if (params?.sortOrder) search.set("sortOrder", params.sortOrder);
        if (params?.search) search.set("search", params.search);

        const queryString = search.toString();
        return this.get<PaginatedResult<ProjectMasterListRow>>(queryString ? `?${queryString}` : "");
    }

    async getById(id: number): Promise<ProjectMasterResponse> {
        return this.get<ProjectMasterResponse>(`/${id}`);
    }

    async create(data: CreateProjectMasterDto): Promise<ProjectMasterResponse> {
        return this.post<ProjectMasterResponse>("", data);
    }

    async update(id: number, data: Omit<UpdateProjectMasterDto, "id">): Promise<ProjectMasterResponse> {
        return this.patch<ProjectMasterResponse>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const projectMasterService = new ProjectMasterService();
