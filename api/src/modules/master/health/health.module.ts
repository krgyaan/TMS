import { Module } from "@nestjs/common";
import { HealthController } from "@/modules/master/health/health.controller";
import { HealthService } from "@/modules/master/health/health.service";
import { DatabaseModule } from "@/db/database.module";
import { QueueModule } from "@/infra/queue/queue.module";

@Module({
    imports: [DatabaseModule, QueueModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
