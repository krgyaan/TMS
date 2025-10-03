import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { ItemHeadingsController } from './item-headings.controller';
import { ItemHeadingsService } from './item-headings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemHeadingsController],
  providers: [ItemHeadingsService],
})
export class ItemHeadingsModule {}
