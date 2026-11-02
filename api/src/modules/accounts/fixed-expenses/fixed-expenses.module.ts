import { Module } from "@nestjs/common";
import { DatabaseModule } from "@db/database.module";
import { FixedExpensesController } from "./fixed-expenses.controller";
import { FixedExpensesService } from "./fixed-expenses.service";

@Module({
    imports: [DatabaseModule],
    controllers: [FixedExpensesController],
    providers: [FixedExpensesService],
    exports: [FixedExpensesService],
})
export class FixedExpensesModule {}
