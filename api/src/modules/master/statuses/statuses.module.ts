import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { StatusesController } from '@/modules/master/statuses/statuses.controller';
import { StatusesService } from '@/modules/master/statuses/statuses.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StatusesController],
  providers: [StatusesService],
})
export class StatusesModule {}
