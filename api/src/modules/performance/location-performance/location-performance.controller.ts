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

    @Get()
    @CanRead("performance.location")
    getLocationPerformance(@Query() query: Record<string, string>) {
        const parsed = locationPerformanceQuerySchema.safeParse({
            team: query.team,
            location: query.location,
            heading: query.heading,
            year: query.year,
        });

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.getLocationPerformance(parsed.data);
    }
}
