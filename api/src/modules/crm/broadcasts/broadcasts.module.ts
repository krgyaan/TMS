import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';

@Module({
    imports: [DatabaseModule],
    controllers: [BroadcastsController],
    providers: [BroadcastsService],
    exports: [BroadcastsService],
})
export class BroadcastsModule {}