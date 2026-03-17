import { BaseApiService } from './base.service';
import type {
  WoContact,
  CreateWoContactDto,
  UpdateWoContactDto,
  CreateBulkWoContactsDto,
  WoContactsFilters,
  ContactsSummary,
  PaginatedResult,
} from '@/modules/operations/types/wo.types';

class WoContactsService extends BaseApiService {
  constructor() {
    super('/wo-contacts');
  }

  private buildQueryString(filters?: WoContactsFilters): string {
    if (!filters) return '';

    const params = new URLSearchParams();

    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.search) params.set('search', filters.search);
    if (filters.woBasicDetailId) params.set('woBasicDetailId', String(filters.woBasicDetailId));
    if (filters.organization) params.set('organization', filters.organization);
    if (filters.departments) params.set('departments', filters.departments);
    if (filters.name) params.set('name', filters.name);
    if (filters.email) params.set('email', filters.email);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  // CRUD Operations
  async getAll(filters?: WoContactsFilters): Promise<PaginatedResult<WoContact>> {
    return this.get<PaginatedResult<WoContact>>(this.buildQueryString(filters));
  }

  async getById(id: number): Promise<WoContact> {
    return this.get<WoContact>(`/${id}`);
  }

  async getByWoBasicDetailId(woBasicDetailId: number): Promise<WoContact[]> {
    return this.get<WoContact[]>(`/by-basic-detail/${woBasicDetailId}`);
  }

  async getByDepartment(woBasicDetailId: number, department: string): Promise<WoContact[]> {
    return this.get<WoContact[]>(`/by-department/${woBasicDetailId}/${department}`);
  }

  async create(data: CreateWoContactDto): Promise<WoContact> {
    return this.post<WoContact>('', data);
  }

  async createBulk(data: CreateBulkWoContactsDto): Promise<{ created: number; data: WoContact[] }> {
    return this.post<{ created: number; data: WoContact[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoContactDto): Promise<WoContact> {
    return this.patch<WoContact>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByBasicDetail(woBasicDetailId: number): Promise<void> {
    return this.delete(`/by-basic-detail/${woBasicDetailId}`);
  }

  // Utility Operations
  async checkEmailExists(email: string, woBasicDetailId?: number): Promise<{ exists: boolean; email: string }> {
    const params = woBasicDetailId ? `?woBasicDetailId=${woBasicDetailId}` : '';
    return this.get<{ exists: boolean; email: string }>(`/check-email/${email}${params}`);
  }

  async getContactsSummary(woBasicDetailId: number): Promise<ContactsSummary> {
    return this.get<ContactsSummary>(`/summary/${woBasicDetailId}`);
  }
}

export const woContactsService = new WoContactsService();
