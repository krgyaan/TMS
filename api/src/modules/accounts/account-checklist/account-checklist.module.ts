import { Module } from "@nestjs/common";
import { AuthModule } from "@/modules/auth/auth.module";
import { AccountChecklistController } from "./account-checklist.controller";
import { AccountChecklistServiceModule } from "./account-checklist-service.module";

@Module({
    imports: [AccountChecklistServiceModule, AuthModule],
    controllers: [AccountChecklistController],
    exports: [AccountChecklistServiceModule],
})
export class AccountChecklistModule {}