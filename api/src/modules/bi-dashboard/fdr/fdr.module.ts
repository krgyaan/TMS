import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FdrController } from './fdr.controller';
import { FdrService } from './fdr.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';

@Module({
    imports: [DatabaseModule, FollowUpModule],
    controllers: [FdrController],
    providers: [FdrService],
    exports: [FdrService],
})
export class FdrModule {}
