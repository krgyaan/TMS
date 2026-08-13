import { BaseApiService } from "./base.service";
import type {
    ConferenceCallReport,
    ConferenceListItemWithReport,
    CreateConferenceCallReportDto,
    UpdateConferenceCallReportDto,
} from "@/modules/services/conference/helpers/conference.types";

class ConferenceService extends BaseApiService {
    constructor() {
        super("/conference");
    }

    async getAll(complaintId?: number): Promise<ConferenceCallReport[]> {
        return this.get<ConferenceCallReport[]>(complaintId ? `?complaintId=${complaintId}` : "");
    }

    async getList(): Promise<ConferenceListItemWithReport[]> {
        const raw = await this.get<ConferenceListItemWithReport[]>("/list");
        return raw.map(row => ({
            ...row,
            hasReport: !!row.conferenceId,
        }));
    }

    async getById(id: number): Promise<ConferenceCallReport> {
        return this.get<ConferenceCallReport>(`/${id}`);
    }

    async getByComplaintId(complaintId: number): Promise<ConferenceCallReport | null> {
        const result = await this.get<ConferenceCallReport | null>(`/complaint/${complaintId}`);
        return result;
    }

    async create(data: CreateConferenceCallReportDto): Promise<ConferenceCallReport> {
        return this.post<ConferenceCallReport>("", data);
    }

    async update(id: number, data: UpdateConferenceCallReportDto): Promise<ConferenceCallReport> {
        return this.put<ConferenceCallReport>(`/${id}`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${id}`);
    }
}

export const conferenceService = new ConferenceService();
