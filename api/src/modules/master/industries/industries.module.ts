import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { IndustriesController } from './industries.controller';
import { IndustriesService } from './industries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [IndustriesController],
  providers: [IndustriesService],
})
export class IndustriesModule {}
