import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { PayOnPortalController } from './pay-on-portal.controller';
import { PayOnPortalService } from './pay-on-portal.service';

@Module({
    imports: [DatabaseModule],
    controllers: [PayOnPortalController],
    providers: [PayOnPortalService],
    exports: [PayOnPortalService],
})
export class PayOnPortalModule {}
