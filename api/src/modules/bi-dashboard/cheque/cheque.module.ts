import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { ChequeController } from './cheque.controller';
import { ChequeService } from './cheque.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { EmdsModule } from '@/modules/tendering/emds/emds.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, EmdsModule],
    controllers: [ChequeController],
    providers: [ChequeService],
    exports: [ChequeService],
})
export class ChequeModule { }
