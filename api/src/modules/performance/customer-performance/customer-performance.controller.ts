import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators";

import { CustomerPerformanceService } from "./customer-performance.service";
import { customerPerformanceQuerySchema } from "./zod/customer-performance.dto";

@Controller("performance/customer")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CustomerPerformanceController {
    constructor(private readonly service: CustomerPerformanceService) {}

    /**
     * GET /performance/customer
     *   ?org=1&teamId=2&itemHeading=3&fromDate=2024-01-01&toDate=2024-12-31
     *
     * All filters are optional — mirrors Laravel where each filter is
     * only applied when($filters['x']) i.e. when non-empty.
     */
    @Get()
    @CanRead("performance.customer")
    getCustomerPerformance(@Query() query: Record<string, string>) {
        const parsed = customerPerformanceQuerySchema.safeParse({
            org: query.org,
            teamId: query.teamId,
            itemHeading: query.itemHeading,
            fromDate: query.fromDate,
            toDate: query.toDate,
        });

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.getCustomerPerformance(parsed.data);
    }
}
