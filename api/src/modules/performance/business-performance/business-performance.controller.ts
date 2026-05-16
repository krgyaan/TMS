import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators";

import { BusinessPerformanceService } from "./business-performance.service";
import { businessPerformanceQuerySchema } from "./zod/business-performance.dto";

@Controller("performance/business")
// @UseGuards(JwtAuthGuard, PermissionGuard)
export class BusinessPerformanceController {
    constructor(private readonly service: BusinessPerformanceService) {}

    /**
     * GET /performance/business/headings
     * Replaces: ItemHeading::where('status', '1')->get() in the controller
     */
    @Get("headings")
    @CanRead("performance.business")
    getItemHeadings() {
        return this.service.getItemHeadings();
    }

    /**
     * GET /performance/business?heading=1&fromDate=2024-01-01&toDate=2024-12-31
     * Replaces: POST /performance/business in Laravel
     */
    @Get()
    @CanRead("performance.business")
    getBusinessPerformance(@Query() query: Record<string, string>) {
        const parsed = businessPerformanceQuerySchema.safeParse({
            heading: query.heading,
            fromDate: query.fromDate,
            toDate: query.toDate,
        });

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.getBusinessPerformance(parsed.data);
    }
}
