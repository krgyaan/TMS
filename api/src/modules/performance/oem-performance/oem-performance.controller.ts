import { Controller, Get, Query, UseGuards, BadRequestException, Inject } from "@nestjs/common";

import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanRead } from "@/modules/auth/decorators";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";

import { OemPerformanceService } from "./oem-performance.service";
import { oemPerformanceQuerySchema } from "./zod/oem-performance.dto";

@Controller("performance/oem")
// @UseGuards(JwtAuthGuard, PermissionGuard)
export class OemPerformanceController {
    constructor(
        private readonly service: OemPerformanceService,
        @Inject(WINSTON_MODULE_PROVIDER)
        private readonly logger: Logger
    ) {}

    /**
     * GET /performance/oem?oem=1&fromDate=2024-01-01&toDate=2024-12-31
     *
     * Permission: read on "performance.oem" — adjust the module string
     * to whatever key you register in your permissions table.
     */

    @Get("health")
    async getHealth() {
        this.logger.debug("This is the debug statement");
        return {
            status: "ok",
            message: "The api is working",
        };
    }

    @Get()
    @CanRead("performance.oem")
    async getOemPerformance(@Query() query: Record<string, string>) {
        this.logger.debug({ message: "oem performance request made", query });

        const parsed = oemPerformanceQuerySchema.safeParse({
            oem: query.oem,
            fromDate: query.fromDate,
            toDate: query.toDate,
        });

        this.logger.debug({ message: "New Request Made.", parsed });

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.getOemPerformance(parsed.data);
    }
}
