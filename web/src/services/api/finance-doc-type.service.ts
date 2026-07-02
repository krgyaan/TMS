import { BaseApiService } from "./base.service";
import type { FinanceDocType } from "@/types/api.types";

class FinanceDocTypeService extends BaseApiService {
    constructor() {
        super("/finance-doc-type");
    }

    async getAll(): Promise<FinanceDocType[]> {
        return this.get<FinanceDocType[]>("");
    }

    async getById(id: number): Promise<FinanceDocType> {
        return this.get<FinanceDocType>(`/${id}`);
    }
}

export const financeDocTypeService = new FinanceDocTypeService();
