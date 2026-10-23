import { BaseApiService } from './base.service';
import type { Transporter } from '@/modules/operations/sale-invoices/helpers/saleInvoice.types';

const buildPickerQuery = (q?: string, ids?: number[]): string => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (ids && ids.length > 0) params.set('ids', ids.join(','));
    const str = params.toString();
    return str ? `?${str}` : '';
};

export interface CreateTransporterPayload {
    name: string;
    gstNo?: string | null;
    phone?: string | null;
    address?: string | null;
}

class TransporterApiService extends BaseApiService {
    constructor() {
        super('/transporters');
    }

    async getTransporterOptions(q?: string, ids?: number[]): Promise<Transporter[]> {
        return this.get(buildPickerQuery(q, ids));
    }

    async createTransporter(data: CreateTransporterPayload): Promise<Transporter> {
        return this.post('/', data);
    }
}

export const transporterApi = new TransporterApiService();
