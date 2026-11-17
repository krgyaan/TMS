import { Module } from '@nestjs/common';
import { DatabaseModule } from '@db/database.module';
import { BankGuaranteeController } from './bank-guarantee.controller';
import { BankGuaranteeService } from './bank-guarantee.service';
import { FollowUpModule } from '@/modules/follow-up/follow-up.module';
import { PaymentRequestsNotificationServiceModule } from '@/modules/tendering/payment-requests/payment-requests-notification-service.module';
import { MakerRequestModule } from '@/modules/operations/maker-requests/maker-request.module';

@Module({
    imports: [DatabaseModule, FollowUpModule, PaymentRequestsNotificationServiceModule, MakerRequestModule],
    controllers: [BankGuaranteeController],
    providers: [BankGuaranteeService],
    exports: [BankGuaranteeService],
})
export class BankGuaranteeModule {}
