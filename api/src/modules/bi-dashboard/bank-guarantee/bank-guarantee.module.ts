import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BankGuaranteeController } from './bank-guarantee.controller';
import { BankGuaranteeService } from './bank-guarantee.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsNotificationServiceModule } from '@/modules/tendering/payment-requests/payment-requests-notification-service.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsNotificationServiceModule],
    controllers: [BankGuaranteeController],
    providers: [BankGuaranteeService],
    exports: [BankGuaranteeService],
})
export class BankGuaranteeModule {}
