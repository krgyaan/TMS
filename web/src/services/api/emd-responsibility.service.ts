import { BaseApiService } from "./base.service";
import type { EmdResponsibility, CreateEmdResponsibilityDto, UpdateEmdResponsibilityDto } from "@/types/api.types";

class EmdResponsibilityService extends BaseApiService {
    constructor() {
        super("/emd-responsibilities");
    }

    async getAll(): Promise<EmdResponsibility[]> {
        console.log("Fetching all EMD Responsibilities from Service", this.get<EmdResponsibility[]>(""));
        return this.get<EmdResponsibility[]>("");
    }

    async getById(id: number): Promise<EmdResponsibility> {
        return this.get<EmdResponsibility>(`/${id}`);
    }

    async create(data: CreateEmdResponsibilityDto): Promise<EmdResponsibility> {
        return this.post<EmdResponsibility>("", data);
    }

    async update(id: number, data: UpdateEmdResponsibilityDto): Promise<EmdResponsibility> {
        return this.patch<EmdResponsibility>(`/${id}`, data);
    }
}

export const emdResponsibilityService = new EmdResponsibilityService();
