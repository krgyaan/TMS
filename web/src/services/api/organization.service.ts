import { BaseApiService } from './base.service';
import type { Organization, CreateOrganizationDto, UpdateOrganizationDto } from '@/types/api.types';

class OrganizationsService extends BaseApiService {
    constructor() {
        super('/organizations');
    }

    async getAll(): Promise<Organization[]> {
        return this.get<Organization[]>('');
    }

    async getById(id: number): Promise<Organization> {
        return this.get<Organization>(`/${id}`);
    }

    async create(data: CreateOrganizationDto): Promise<Organization> {
        return this.post<Organization>('', data);
    }

    async update(id: number, data: UpdateOrganizationDto): Promise<Organization> {
        return this.patch<Organization>(`/${id}`, data);
    }

    async deleteOrganization(id: number): Promise<void> {
        return this.delete<void>(`/${id}`);
    }

    //   async search(query: string): Promise<Organization[]> {
    //     return this.get<Organization[]>('/search', { params: { q: query } });
    //   }

    async getByIndustry(industryId: number): Promise<Organization[]> {
        return this.get<Organization[]>(`/industry/${industryId}`);
    }
}

export const organizationsService = new OrganizationsService();
