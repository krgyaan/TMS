import { BaseApiService } from "./base.service";
import type {
  Complaint,
  CreateComplaintDto,
} from "@/modules/hrms/complaints/helpers/types";
import type { PaginatedResult } from "@/types/api.types";

export type ComplaintListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

class ComplaintsService extends BaseApiService {
  constructor() {
    super("/hrms/complaints");
  }

  /** Complaints filed by the authenticated employee (support page). */
  async getMine(): Promise<Complaint[]> {
    return this.get<Complaint[]>();
  }

  /** Admin list — every complaint (Coordinator+ guarded server-side). */
  async getAll(
    params: ComplaintListParams = {}
  ): Promise<PaginatedResult<Complaint>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.priority) query.set("priority", params.priority);
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);

    const qs = query.toString();
    return this.get<PaginatedResult<Complaint>>(`/all${qs ? `?${qs}` : ""}`);
  }

  /** Lookup lists for the complaint form selects. */
  async getLookups(): Promise<{
    users: { id: number; name: string }[];
    departments: { id: number; name: string }[];
  }> {
    return this.get("/lookups");
  }

  /** Single enriched complaint (view page). */
  async getById(id: number): Promise<Complaint> {
    return this.get<Complaint>(`/${id}/detail`);
  }

  /** HR/admin lifecycle status update. */
  async updateStatus(
    id: number,
    data: { status: string; remarks?: string }
  ): Promise<Complaint> {
    return this.patch<Complaint>(`/${id}/status`, data);
  }

  async create(data: CreateComplaintDto): Promise<Complaint> {
    return this.post<Complaint>("", data);
  }

  /** Edit own complaint — server allows only while status is "open". */
  async update(
    id: number,
    data: Record<string, unknown>
  ): Promise<Complaint> {
    return this.patch<Complaint>(`/${id}`, data);
  }

  /** Delete own complaint — server allows only while status is "open". */
  async remove(id: number): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(`/${id}`);
  }
}

export const complaintsService = new ComplaintsService();
