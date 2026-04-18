import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators";

import { LocationPerformanceService } from "./location-performance.service";
import { locationPerformanceQuerySchema } from "./zod/location-performance.dto";

@Controller("performance/location")
// @UseGuards(JwtAuthGuard, PermissionGuard)
export class LocationPerformanceController {
    constructor(private readonly service: LocationPerformanceService) {}

    /**
     * GET /performance/business?heading=1&fromDate=2024-01-01&toDate=2024-12-31
     * Replaces: POST /performance/business in Laravel
     */
    @Get()
    @CanRead("performance.location")
    getLocationPerformance(@Query() query: Record<string, string>) {
        const parsed = locationPerformanceQuerySchema.safeParse({
            area: query.area,
            team: query.team,
            location: query.location,
            heading: query.heading,
            fromDate: query.fromDate,
            toDate: query.toDate,
        });

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.getLocationPerformance(parsed.data);
    }
}
