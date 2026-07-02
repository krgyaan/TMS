import { BaseApiService } from "./base.service";

export interface EmployeeProfile {
    id: number;
    userId: number;
    employeeType?: string;
    employeeStatus?: string;
    workLocation?: string;
    officialEmail?: string;
    reportingManagerId?: number;
    // adding basic fields
    [key: string]: any;
}

class HrmsEmployeeProfilesService extends BaseApiService {
    constructor() {
        super("/employee-profiles");
    }

    async getAll(): Promise<EmployeeProfile[]> {
        return this.get<EmployeeProfile[]>("");
    }

    async getByUserId(userId: number): Promise<EmployeeProfile | null> {
        return this.get<EmployeeProfile | null>(`/${userId}`);
    }

    async create(data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
        return this.post<EmployeeProfile>("", data);
    }

    async updateByUserId(userId: number, data: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
        return this.patch<EmployeeProfile>(`/${userId}`, data);
    }
}

export const hrmsEmployeeProfilesService = new HrmsEmployeeProfilesService();
