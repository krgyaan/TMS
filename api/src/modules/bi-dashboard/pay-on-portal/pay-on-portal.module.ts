import { Module } from '@nestjs/common';
import { PayOnPortalController } from './pay-on-portal.controller';
import { PayOnPortalService } from './pay-on-portal.service';

@Module({
    controllers: [PayOnPortalController],
    providers: [PayOnPortalService],
    exports: [PayOnPortalService],
})
export class PayOnPortalModule {}
