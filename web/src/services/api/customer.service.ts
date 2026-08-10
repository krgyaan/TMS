import { BaseApiService } from "./base.service";
import type {
    CustomerComplaintDetail,
    CreateCustomerComplaintDto,
    UpdateCustomerComplaintDto,
} from "@/modules/services/customer/helpers/customer.types";

class CustomerService extends BaseApiService {
    constructor() {
        super("/customer");
    }

    async getAll(search?: string): Promise<CustomerComplaintDetail[]> {
        return this.get<CustomerComplaintDetail[]>(
            search ? `?search=${encodeURIComponent(search)}` : "",
        );
    }

    async getById(id: number): Promise<CustomerComplaintDetail> {
        return this.get<CustomerComplaintDetail>(`/${id}`);
    }

    async create(data: CreateCustomerComplaintDto): Promise<CustomerComplaintDetail> {
        return this.post<CustomerComplaintDetail>("", data);
    }

    async update(id: number, data: UpdateCustomerComplaintDto): Promise<CustomerComplaintDetail> {
        return this.put<CustomerComplaintDetail>(`/${id}`, data);
    }

    async remove(id: number): Promise<{ success: boolean }> {
        return this.delete<{ success: boolean }>(`/${id}`);
    }
}

export const customerService = new CustomerService();
