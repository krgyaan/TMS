import { BaseApiService } from "./base.service";
import type { LocationPerformanceParams, LocationPerformanceResponse } from "@/modules/performance/location-performance/helpers/location-performance.types";

class LocationPerformanceApiService extends BaseApiService {
    constructor() {
        super("/performance/location");
    }

    async getReport(params: LocationPerformanceParams): Promise<LocationPerformanceResponse> {
        return this.get<LocationPerformanceResponse>("", {
            params: {
                heading: params.headingId,
                state: params.state,
                region: params.region,
                team: params.team,
                fromDate: params.fromDate,
                toDate: params.toDate,
            },
        });
    }
}

export const locationPerformanceService = new LocationPerformanceApiService();
