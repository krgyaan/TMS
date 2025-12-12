import { Module } from "@nestjs/common";
import { DatabaseModule } from "@/db/database.module";
import { ImprestCategoriesController } from "@/modules/master/imprest-categories/imprest-categories.controller";
import { ImprestCategoriesService } from "@/modules/master/imprest-categories/imprest-categories.service";

@Module({
    imports: [DatabaseModule],
    controllers: [ImprestCategoriesController],
    providers: [ImprestCategoriesService],
    exports: [ImprestCategoriesService],
})
export class ImprestCategoriesModule {}
