import { Module } from '@nestjs/common';
import { WoAmendmentsController } from './wo-amendments.controller';
import { WoAmendmentsService } from './wo-amendments.service';
import { DatabaseModule } from '@/db/database.module';

@Module({
    imports: [DatabaseModule],
    controllers: [WoAmendmentsController],
    providers: [WoAmendmentsService],
    exports: [WoAmendmentsService],
})
export class WoAmendmentsModule {}
