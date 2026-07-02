import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { RfqResponseService } from './rfq-response.service';
import { RfqResponseController } from './rfq-response.controller';
import { RfqsModule } from '@/modules/tendering/rfqs/rfq.module';

@Module({
    imports: [DatabaseModule, RfqsModule],
    controllers: [RfqResponseController],
    providers: [RfqResponseService],
    exports: [RfqResponseService],
})
export class RfqResponseModule {}
