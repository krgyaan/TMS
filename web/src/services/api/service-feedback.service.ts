import { BaseApiService } from "./base.service";
import type {
    ServiceFeedback,
    ServiceFeedbackListItemWithFeedback,
    CreateServiceFeedbackDto,
    UpdateServiceFeedbackDto,
} from "@/modules/services/service-feedback/helpers/service-feedback.types";

class ServiceFeedbackService extends BaseApiService {
    constructor() {
        super("/service-feedback");
    }

    async getAll(complaintId?: number): Promise<ServiceFeedback[]> {
        return this.get<ServiceFeedback[]>(complaintId ? `?complaintId=${complaintId}` : "");
    }

    async getList(): Promise<ServiceFeedbackListItemWithFeedback[]> {
        const raw = await this.get<ServiceFeedbackListItemWithFeedback[]>("/list");
        return raw.map(row => ({
            ...row,
            hasFeedback: !!row.feedbackId,
        }));
    }

    async getById(id: number): Promise<ServiceFeedback> {
        return this.get<ServiceFeedback>(`/${id}`);
    }

    async getByComplaintId(complaintId: number): Promise<ServiceFeedback | null> {
        return this.get<ServiceFeedback | null>(`/complaint/${complaintId}`);
    }

    async create(data: CreateServiceFeedbackDto): Promise<ServiceFeedback> {
        return this.post<ServiceFeedback>("", data);
    }

    async update(id: number, data: UpdateServiceFeedbackDto): Promise<ServiceFeedback> {
        return this.put<ServiceFeedback>(`/${id}`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${id}`);
    }
}

export const serviceFeedbackService = new ServiceFeedbackService();
