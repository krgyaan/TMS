import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../db/database.module';
import { RfqsService } from './rfq.service';
import { RfqsController } from './rfq.controller';

@Module({
    imports: [DatabaseModule],
    controllers: [RfqsController],
    providers: [RfqsService],
    exports: [RfqsService],
})
export class RfqsModule { }
