import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';

@Module({
    imports: [DatabaseModule, FollowUpModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService],
    exports: [DemandDraftService],
})
export class DemandDraftModule { }
