import { Module } from '@nestjs/common';
import { WoDetailsController } from './wo-details.controller';
import { WoDetailsService } from './wo-details.service';
import { WoAcceptanceController } from './wo-acceptance.controller';
import { WoAcceptanceService } from './wo-acceptance.service';
import { DatabaseModule } from '@/db/database.module';
import { EmailModule } from '@/modules/email/email.module';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { CourierModule } from '@/modules/courier/courier.module';
import { WoAmendmentsModule } from '../wo-amendments/wo-amendments.module';

@Module({
    imports: [
        DatabaseModule,
        EmailModule,
        FollowUpModule,
        CourierModule,
        WoAmendmentsModule,
    ],
    controllers: [WoDetailsController, WoAcceptanceController],
    providers: [WoDetailsService, WoAcceptanceService],
    exports: [WoDetailsService, WoAcceptanceService],
})
export class WoDetailsModule {}
