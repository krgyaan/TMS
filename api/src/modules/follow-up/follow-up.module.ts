import { Module } from "@nestjs/common";
import { FollowUpController } from "./follow-up.controller";
import { FollowUpService } from "./follow-up.service";
import { DatabaseModule } from "../../db/database.module";

@Module({
    imports: [DatabaseModule],
    controllers: [FollowUpController],
    providers: [FollowUpService],
    exports: [FollowUpService],
})
export class FollowUpModule {}
