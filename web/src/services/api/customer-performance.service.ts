import { BaseApiService } from "./base.service";
import type { CustomerPerformanceParams, CustomerPerformanceResponse } from "@/modules/performance/customer-performance/helpers/customer-performance.types";

class CustomerPerformanceApiService extends BaseApiService {
    constructor() {
        super("/performance/customer");
    }

    async getReport(params: CustomerPerformanceParams): Promise<CustomerPerformanceResponse> {
        const search = new URLSearchParams();
        if (params.org !== undefined) search.set("org", String(params.org));
        if (params.teamCategory !== undefined) search.set("teamCategory", params.teamCategory);
        if (params.itemHeading !== undefined) search.set("itemHeading", String(params.itemHeading));
        if (params.fromDate !== undefined) search.set("fromDate", params.fromDate);
        if (params.toDate !== undefined) search.set("toDate", params.toDate);

        const query = search.toString();
        return this.get<CustomerPerformanceResponse>(query ? `?${query}` : "");
    }
}

export const customerPerformanceService = new CustomerPerformanceApiService();
