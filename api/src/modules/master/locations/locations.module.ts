import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
