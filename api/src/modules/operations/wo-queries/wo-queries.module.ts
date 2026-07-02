import { Module } from '@nestjs/common';
import { WoQueriesController } from './wo-queries.controller';
import { WoQueriesService } from './wo-queries.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WoQueriesController],
  providers: [WoQueriesService],
  exports: [WoQueriesService],
})
export class WoQueriesModule {}
