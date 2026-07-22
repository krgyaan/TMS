import { BaseApiService } from "./base.service";

class MakerRequestApiService extends BaseApiService {
    constructor() {
        super("/maker-requests");
    }

    async getAll() {
        return this.get<any[]>("/");
    }

    async getMyRequests() {
        return this.get<any[]>("/my-maker-requests");
    }

    async getById(id: number) {
        return this.get<any>(`/${id}`);
    }

    async create(data: any) {
        return this.post<any>("/", data);
    }

    async updateStatus(id: number, data: { status: string; utrNumber?: string; rejectionReason?: string }) {
        return this.patch<any>(`/${id}/status`, data);
    }
}

export const makerRequestApi = new MakerRequestApiService();
