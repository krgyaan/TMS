import { BaseApiService } from "./base.service";
import type { PaginatedResult } from "@/types/api.types";
import type {
    CreateFollowUpDto,
    FollowUpCounts,
    FollowUpDetails,
    FollowUpListRow,
    FollowUpQueryParams,
    UpdateFollowUpPayload,
    UpdateFollowUpStatusPayload,
} from "@/modules/shared/follow-up/helpers/followUp.types";

class FollowUpService extends BaseApiService {
    constructor() {
        super("/follow-up");
    }

    async getAll(params?: FollowUpQueryParams): Promise<PaginatedResult<FollowUpListRow>> {
        const search = new URLSearchParams();
        if (params?.tab) search.set("tab", params.tab);
        if (params?.assignedToId) search.set("assignedToId", String(params.assignedToId));
        if (params?.createdById) search.set("createdById", String(params.createdById));
        if (params?.search) search.set("search", params.search);
        if (params?.page) search.set("page", String(params.page));
        if (params?.limit) search.set("limit", String(params.limit));
        if (params?.sortBy) search.set("sortBy", params.sortBy);
        if (params?.sortOrder) search.set("sortOrder", params.sortOrder);

        const queryString = search.toString();
        return this.get<PaginatedResult<FollowUpListRow>>(queryString ? `?${queryString}` : "");
    }

    async getById(id: number): Promise<FollowUpDetails> {
        return this.get<FollowUpDetails>(`/${id}`);
    }

    async getCounts(): Promise<FollowUpCounts> {
        return this.get<FollowUpCounts>("/dashboard/counts");
    }

    async create(data: CreateFollowUpDto): Promise<FollowUpDetails> {
        return this.post<FollowUpDetails>("", data);
    }

    async update(id: number, data: UpdateFollowUpPayload): Promise<FollowUpDetails> {
        return this.put<FollowUpDetails>(`/${id}`, data);
    }

    async updateStatus(id: number, data: UpdateFollowUpStatusPayload): Promise<FollowUpDetails> {
        return this.put<FollowUpDetails>(`/${id}/status`, data);
    }

    async remove(id: number): Promise<void> {
        await this.delete<void>(`/${id}`);
    }

    async getPreviewMail(emdId: number): Promise<{ html: string | null; message?: string }> {
        return this.get<{ html: string | null; message?: string }>(`/preview-mail/${emdId}`);
    }
}

export const followUpService = new FollowUpService();
