import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { LocationsController } from '@/modules/master/locations/locations.controller';
import { LocationsService } from '@/modules/master/locations/locations.service';

@Module({
    imports: [DatabaseModule],
    controllers: [LocationsController],
    providers: [LocationsService],
    exports: [LocationsService],
})
export class LocationsModule { }
