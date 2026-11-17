import { BaseApiService } from './base.service';

export interface OtherContact {
    id: number;
    name: string;
    designation: string | null;
    email: string | null;
    phone: string | null;
    purpose: string | null;
}

export interface CreateOtherContactPayload {
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
    purpose?: string;
}

class OtherContactsService extends BaseApiService {
    constructor() {
        super('/other-contacts');
    }

    async list(purpose?: string): Promise<OtherContact[]> {
        return this.get(purpose ? `?purpose=${encodeURIComponent(purpose)}` : '');
    }

    async create(data: CreateOtherContactPayload): Promise<OtherContact> {
        return this.post('', data);
    }
}

export const otherContactsService = new OtherContactsService();
