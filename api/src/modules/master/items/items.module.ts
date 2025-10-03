import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
