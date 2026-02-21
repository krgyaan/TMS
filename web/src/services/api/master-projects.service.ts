import { BaseApiService } from "./base.service";
import type {
    MasterProjectListParams,
    MasterProjectListRow,
    MasterProjectResponse,
    CreateMasterProjectDto,
    UpdateMasterProjectDto,
} from "@/modules/shared/master-project/helpers/masterProject.types";
import type { PaginatedResult } from "@/types/api.types";

class MasterProjectsService extends BaseApiService {
    constructor() {
        super("/document-dashboard/projects");
    }

    async getAll(params?: MasterProjectListParams): Promise<PaginatedResult<MasterProjectListRow>> {
        const search = new URLSearchParams();

        if (params?.page) search.set("page", String(params.page));
        if (params?.limit) search.set("limit", String(params.limit));
        if (params?.sortBy) search.set("sortBy", params.sortBy);
        if (params?.sortOrder) search.set("sortOrder", params.sortOrder);
        if (params?.search) search.set("search", params.search);

        const queryString = search.toString();
        return this.get<PaginatedResult<MasterProjectListRow>>(queryString ? `?${queryString}` : "");
    }

    async getById(id: number): Promise<MasterProjectResponse> {
        return this.get<MasterProjectResponse>(`/${id}`);
    }

    async create(data: CreateMasterProjectDto): Promise<MasterProjectResponse> {
        return this.post<MasterProjectResponse>("", data);
    }

    async update(id: number, data: Omit<UpdateMasterProjectDto, "id">): Promise<MasterProjectResponse> {
        return this.patch<MasterProjectResponse>(`/${id}`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }
}

export const masterProjectsService = new MasterProjectsService();
