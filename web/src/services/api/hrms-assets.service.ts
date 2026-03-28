import { BaseApiService } from "./base.service";

export interface EmployeeAsset {
    id: number;
    userId: number;
    assetCode: string;
    assetType: string;
    assetCategory?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    assetStatus?: string;
    assignedDate: string;
    // other fields omitted for brevity
    [key: string]: any;
}

class HrmsAssetsService extends BaseApiService {
    constructor() {
        super("/assets");
    }

    async getAll(): Promise<EmployeeAsset[]> {
        return this.get<EmployeeAsset[]>("");
    }

    async getByUserId(userId: number): Promise<EmployeeAsset[]> {
        return this.get<EmployeeAsset[]>(`/user/${userId}`);
    }

    async getById(id: number): Promise<EmployeeAsset> {
        return this.get<EmployeeAsset>(`/${id}`);
    }

    async create(data: Partial<EmployeeAsset>): Promise<EmployeeAsset> {
        return this.post<EmployeeAsset>("", data);
    }

    async update(id: number, data: Partial<EmployeeAsset>): Promise<EmployeeAsset> {
        return this.patch<EmployeeAsset>(`/${id}`, data);
    }

    async deleteAsset(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }
}

export const hrmsAssetsService = new HrmsAssetsService();
