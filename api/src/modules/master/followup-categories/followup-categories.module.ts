import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/schemas/shared/database.module";
import { FollowupCategoriesController } from "@/modules/master/followup-categories/followup-categories.controller";
import { FollowupCategoriesService } from "@/modules/master/followup-categories/followup-categories.service";

@Module({
    imports: [DatabaseModule],
    controllers: [FollowupCategoriesController],
    providers: [FollowupCategoriesService],
    exports: [FollowupCategoriesService],
})
export class FollowupCategoriesModule {}
