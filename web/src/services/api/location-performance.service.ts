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
                location: params.location,
                team: params.team,
                year: params.year,
            },
        });
    }
}

export const locationPerformanceService = new LocationPerformanceApiService();
