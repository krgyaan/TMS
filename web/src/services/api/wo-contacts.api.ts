// web/src/services/api/wo-contacts.api.ts

import { BaseApiService } from './base.service';
import type {
  WoContact,
  CreateWoContactDto,
  UpdateWoContactDto,
  CreateBulkWoContactsDto,
  WoContactsFilters,
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
    if (filters.woBasicDetailId) params.set('woBasicDetailId', String(filters.woBasicDetailId));
    if (filters.departments) params.set('departments', filters.departments);
    if (filters.search) params.set('search', filters.search);

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
    return this.get<WoContact[]>(`/by-basic-detail/${woBasicDetailId}/department/${department}`);
  }

  async create(data: CreateWoContactDto): Promise<WoContact> {
    return this.post<WoContact>('', data);
  }

  async createBulk(data: CreateBulkWoContactsDto): Promise<{ count: number; contacts: WoContact[] }> {
    return this.post<{ count: number; contacts: WoContact[] }>('/bulk', data);
  }

  async update(id: number, data: UpdateWoContactDto): Promise<WoContact> {
    return this.patch<WoContact>(`/${id}`, data);
  }

  async remove(id: number): Promise<void> {
    return this.delete(`/${id}`);
  }

  async removeAllByBasicDetail(woBasicDetailId: number): Promise<{ count: number }> {
    return this.delete<{ count: number }>(`/by-basic-detail/${woBasicDetailId}`);
  }

  // Utility
  async getContactsSummary(woBasicDetailId: number): Promise<{
    total: number;
    byDepartment: Record<string, number>;
  }> {
    return this.get(`/by-basic-detail/${woBasicDetailId}/summary`);
  }

  async checkEmailExists(email: string, woBasicDetailId?: number): Promise<{ exists: boolean }> {
    const params = new URLSearchParams({ email });
    if (woBasicDetailId) params.set('woBasicDetailId', String(woBasicDetailId));
    return this.get(`/check-email?${params.toString()}`);
  }
}

export const woContactsService = new WoContactsService();
