import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { ImprestCategoriesController } from './imprest-categories.controller';
import { ImprestCategoriesService } from './imprest-categories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ImprestCategoriesController],
  providers: [ImprestCategoriesService],
})
export class ImprestCategoriesModule {}
