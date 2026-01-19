// oem-performance.controller.ts

import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "@/modules/auth/decorators";
import { OemPerformanceService } from "./oem-performance.service";
import { OemPerformanceQuerySchema } from "./zod/oem-performance.dto";
import { z } from "zod";

@Controller("performance/oem")
export class OemPerformanceController {
    constructor(private readonly service: OemPerformanceService) {}

    @Get()
    healthCheck() {
        return "OEM Performance API is running.";
    }

    @Public()
    @Get("summary")
    getSummary(@Query() q: unknown) {
        console.log(q);
        return this.service.getSummary(OemPerformanceQuerySchema.parse(q));
    }

    @Public()
    @Get("tenders")
    getTenders(@Query() q: unknown) {
        return this.service.getTenderList(OemPerformanceQuerySchema.parse(q));
    }

    @Public()
    @Get("not-allowed")
    getNotAllowed(@Query() q: unknown) {
        return this.service.getNotAllowedTenders(OemPerformanceQuerySchema.parse(q));
    }

    @Public()
    @Get("rfqs")
    getRfqs(@Query() q: unknown) {
        return this.service.getRfqsSent(OemPerformanceQuerySchema.parse(q));
    }

    @Public()
    @Get("trends")
    getTrends(@Query() q: unknown) {
        return this.service.getTrends(OemPerformanceQuerySchema.parse(q));
    }

    @Public()
    @Get("scoring")
    getScoring(@Query() q: unknown) {
        return this.service.getScoring(OemPerformanceQuerySchema.parse(q));
    }
}
