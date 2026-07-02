import { BaseApiService } from "./base.service";
import axiosInstance from '@/lib/axios';
import type {
    CreateVendorWorkOrderDTO,
    UpdateVendorWorkOrderDTO,
} from "@/modules/operations/vendor-work-orders/helpers/vwoForm.types";

class VendorWorkOrderApiService extends BaseApiService {
    constructor() {
        super("/vendor-work-orders");
    }

    async getAll() {
        return this.get<any[]>("/");
    }

    async getById(id: number) {
        return this.get<any>(`/${id}`);
    }

    async getByProject(projectId: number) {
        return this.get<any[]>(`/project/${projectId}`);
    }

    async create(data: CreateVendorWorkOrderDTO) {
        return this.post<any, CreateVendorWorkOrderDTO>("/", data);
    }

    async update(id: number, data: UpdateVendorWorkOrderDTO) {
        return this.put<any, UpdateVendorWorkOrderDTO>(`/${id}`, data);
    }

    async getNextWONumber(projectName?: string) {
        const params = projectName ? `?projectName=${encodeURIComponent(projectName)}` : "";
        return this.get<string>(`/next-number${params}`);
    }

    async getParties(type?: string) {
        const params = type ? `?type=${encodeURIComponent(type)}` : "";
        return this.get<any[]>(`/parties${params}`);
    }

    async createParty(data: any) {
        return this.post<any>("/parties", data);
    }

    getPdfDownloadUrl(id: number, version?: string): string {
        const baseUrl = axiosInstance.defaults.baseURL || '';
        let url = `${baseUrl}/vendor-work-orders/${id}/pdf`;
        if (version) url += `?version=${encodeURIComponent(version)}`;
        return url;
    }

    async getPdfVersions(id: number) {
        return this.get<Record<string, { path: string; hash: string }>>(`/${id}/pdf/versions`);
    }

    async deletePdfVersion(id: number, version: string) {
        return this.delete<{ path: string; hash: string }>(`/${id}/pdf/versions/${encodeURIComponent(version)}`);
    }

    async getPdfUrl(id: number, version?: string) {
        const params = version ? `?version=${encodeURIComponent(version)}` : "";
        return this.get<{ path: string; filename: string }>(`/${id}/pdf${params}`);
    }
}

export const vendorWorkOrderApi = new VendorWorkOrderApiService();
