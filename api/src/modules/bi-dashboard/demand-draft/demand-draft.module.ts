import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { DemandDraftController } from './demand-draft.controller';
import { DemandDraftService } from './demand-draft.service';

@Module({
    imports: [DatabaseModule],
    controllers: [DemandDraftController],
    providers: [DemandDraftService],
    exports: [DemandDraftService],
})
export class DemandDraftModule {}
