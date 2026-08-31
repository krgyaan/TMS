import { Controller, Get } from "@nestjs/common";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { HealthService } from "@/modules/master/health/health.service";

@Controller("health")
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @Public()
    async getHealth() {
        return this.healthService.getHealth();
    }
}
