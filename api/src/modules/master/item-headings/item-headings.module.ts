import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ItemHeadingsController } from '@/modules/master/item-headings/item-headings.controller';
import { ItemHeadingsService } from '@/modules/master/item-headings/item-headings.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemHeadingsController],
  providers: [ItemHeadingsService],
})
export class ItemHeadingsModule {}
