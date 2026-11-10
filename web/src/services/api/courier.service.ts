import { BaseApiService } from "./base.service";
import type { PaginatedResult } from "@/types/api.types";
import type {
    Courier,
    CourierDashboardCounts,
    CourierDashboardQueryParams,
    CourierDashboardRow,
    CourierDetails,
    CreateCourierInput,
    CreateDispatchInput,
    UpdateCourierInput,
    UpdateStatusInput,
} from "@/modules/shared/courier/helpers/courier.types";

class CourierService extends BaseApiService {
    constructor() {
        super("/couriers");
    }

    async getDashboard(params: CourierDashboardQueryParams = {}): Promise<PaginatedResult<CourierDashboardRow>> {
        const search = new URLSearchParams();

        if (params.tab) search.set("tab", params.tab);
        if (params.page) search.set("page", String(params.page));
        if (params.limit) search.set("limit", String(params.limit));
        if (params.sortBy) search.set("sortBy", params.sortBy);
        if (params.sortOrder) search.set("sortOrder", params.sortOrder);
        if (params.search) search.set("search", params.search);

        const queryString = search.toString();
        return this.get<PaginatedResult<CourierDashboardRow>>(`/dashboard${queryString ? `?${queryString}` : ""}`);
    }

    async getDashboardCounts(): Promise<CourierDashboardCounts> {
        return this.get<CourierDashboardCounts>("/dashboard/counts");
    }

    async getMyCouriers(): Promise<Courier[]> {
        return this.get<Courier[]>("");
    }

    async getAll(): Promise<Courier[]> {
        return this.get<Courier[]>("/all");
    }

    async getByStatus(status: number): Promise<Courier[]> {
        return this.get<Courier[]>(`/status/${status}`);
    }

    async getById(id: number): Promise<Courier> {
        return this.get<Courier>(`/${id}`);
    }

    async getByIdWithDetails(id: number): Promise<CourierDetails> {
        return this.get<CourierDetails>(`/${id}/details`);
    }

    async create({ data, filenames }: { data: CreateCourierInput; filenames?: string[] }): Promise<Courier> {
        return this.post<Courier>(
            "",
            { ...data, courierDocs: filenames ?? [] },
            { timeout: 120000 }
        );
    }

    async update(id: number, data: UpdateCourierInput): Promise<Courier> {
        return this.put<Courier>(`/${id}`, data);
    }

    async updateStatus(id: number, data: UpdateStatusInput): Promise<Courier> {
        return this.patch<Courier>(`/${id}/status`, data);
    }

    async createDispatch(id: number, data: CreateDispatchInput): Promise<Courier> {
        return this.post<Courier>(`/${id}/dispatch`, data);
    }

    async updateDispatch(id: number, data: CreateDispatchInput): Promise<Courier> {
        return this.patch<Courier>(`/${id}/dispatch`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${id}`);
    }

    async uploadDocs(id: number, filenames: string[]): Promise<Courier> {
        return this.post<Courier>(`/${id}/upload`, { filenames });
    }

    async uploadDeliveryPod(id: number, filename: string): Promise<Courier> {
        return this.post<Courier>(`/${id}/upload-pod`, { filename });
    }
}

export const courierService = new CourierService();

// Backward-compatible alias for existing imports
export const courierApi = courierService;
