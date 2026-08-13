import { BaseApiService } from "./base.service";
import type {
    AllotEngineerDto,
    CustomerComplaintDetail,
    CustomerComplaintListItem,
    CreateCustomerComplaintDto,
    UpdateCustomerComplaintDto,
} from "@/modules/services/customer/helpers/customer.types";

class CustomerService extends BaseApiService {
    constructor() {
        super("/customer");
    }

    async getAll(search?: string): Promise<CustomerComplaintListItem[]> {
        return this.get<CustomerComplaintListItem[]>(
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

    async allotEngineer(id: number, data: AllotEngineerDto) {
        return this.post(`/${id}/engineers`, data);
    }

    async updateEngineer(id: number, engineerId: number, data: AllotEngineerDto) {
        return this.put(`/${id}/engineers/${engineerId}`, data);
    }
}

export const customerService = new CustomerService();