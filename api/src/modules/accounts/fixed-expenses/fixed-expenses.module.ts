import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { MakerRequestModule } from "@/modules/operations/maker-requests/maker-request.module";
import { FixedExpensesController } from "./fixed-expenses.controller";
import { FixedExpensesService } from "./fixed-expenses.service";

@Module({
    imports: [DatabaseModule, MakerRequestModule],
    controllers: [FixedExpensesController],
    providers: [FixedExpensesService],
    exports: [FixedExpensesService],
})
export class FixedExpensesModule {}
