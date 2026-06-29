import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { CircularsController } from './circulars.controller';
import { CircularsService } from './circulars.service';

@Module({
    imports: [DatabaseModule],
    controllers: [CircularsController],
    providers: [CircularsService],
    exports: [CircularsService],
})
export class CircularsModule {}
