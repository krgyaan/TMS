import { Module } from '@nestjs/common';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';

@Module({
    controllers: [DemandDraftController],
    providers: [DemandDraftService],
    exports: [DemandDraftService],
})
export class DemandDraftModule {}
