import { BaseApiService } from "./base.service";
import type {
    AmcServiceDetail,
    ServicePathField,
} from "@/modules/services/amc/helpers/amc.types";

class AmcServicesService extends BaseApiService {
    constructor() {
        super("/amc-services");
    }

    async getAll(amcId?: number, siteId?: number): Promise<AmcServiceDetail[]> {
        const params = new URLSearchParams();
        if (amcId) params.set("amcId", String(amcId));
        if (siteId) params.set("siteId", String(siteId));
        const query = params.toString();
        return this.get<AmcServiceDetail[]>(query ? `?${query}` : "");
    }

    async getById(id: number): Promise<AmcServiceDetail> {
        return this.get<AmcServiceDetail>(`/${id}`);
    }

    async uploadFile(id: number, field: ServicePathField, path: string): Promise<AmcServiceDetail> {
        return this.post<AmcServiceDetail>(`/${id}/upload/${field}`, { path });
    }
}

export const amcServicesService = new AmcServicesService();
