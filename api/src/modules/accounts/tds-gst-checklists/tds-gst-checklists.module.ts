import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { TdsChecklistController } from "./tds-checklist.controller";
import { TdsChecklistService } from "./tds-checklist.service";
import { GstChecklistController } from "./gst-checklist.controller";
import { GstChecklistService } from "./gst-checklist.service";

@Module({
    imports: [DatabaseModule],
    controllers: [TdsChecklistController, GstChecklistController],
    providers: [TdsChecklistService, GstChecklistService],
})
export class TdsGstChecklistsModule {}
