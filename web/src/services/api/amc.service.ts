import { BaseApiService } from "./base.service";
import type {
    AmcDetail,
    CreateAmcDto,
    UpdateAmcDto,
} from "@/modules/services/amc/helpers/amc.types";

class AmcService extends BaseApiService {
    constructor() {
        super("/amc");
    }

    async getAll(projectId?: number): Promise<AmcDetail[]> {
        return this.get<AmcDetail[]>(projectId ? `?projectId=${projectId}` : "");
    }

    async getById(id: number): Promise<AmcDetail> {
        return this.get<AmcDetail>(`/${id}`);
    }

    async create(data: CreateAmcDto): Promise<AmcDetail> {
        return this.post<AmcDetail>("", data);
    }

    async update(id: number, data: UpdateAmcDto): Promise<AmcDetail> {
        return this.put<AmcDetail>(`/${id}`, data);
    }

    async remove(id: number): Promise<{ id: number; deleted: boolean }> {
        return this.delete<{ id: number; deleted: boolean }>(`/${id}`);
    }
}

export const amcService = new AmcService();