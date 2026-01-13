import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PayOnPortalController } from './pay-on-portal.controller';
import { PayOnPortalService } from './pay-on-portal.service';

@Module({
    imports: [DatabaseModule, FollowUpModule],
    controllers: [PayOnPortalController],
    providers: [PayOnPortalService],
    exports: [PayOnPortalService],
})
export class PayOnPortalModule { }
