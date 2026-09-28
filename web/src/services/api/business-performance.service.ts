import { BaseApiService } from "./base.service";
import type {
    BusinessPerformanceParams,
    BusinessPerformanceResponse,
    ItemHeadingRow,
    ItemHeadingsResponse,
} from "@/modules/performance/business-performance/helpers/business-performance.types";

export class BusinessPerformanceApiService extends BaseApiService {
    constructor() {
        super("/performance/business");
    }

    async getHeadings(): Promise<ItemHeadingRow[]> {
        const response = await this.get<ItemHeadingsResponse>("/headings");
        return response.headings;
    }

    async getReport(params: BusinessPerformanceParams): Promise<BusinessPerformanceResponse> {
        return this.get<BusinessPerformanceResponse>("", {
            params: {
                heading: params.headingId,
                fromDate: params.fromDate,
                toDate: params.toDate,
            },
        });
    }
}

export const businessPerformanceService = new BusinessPerformanceApiService();
