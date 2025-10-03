import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { FollowupCategoriesController } from './followup-categories.controller';
import { FollowupCategoriesService } from './followup-categories.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FollowupCategoriesController],
  providers: [FollowupCategoriesService],
})
export class FollowupCategoriesModule {}
