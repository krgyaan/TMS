import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { openwaConfig } from '../config/openwa.config';
import { OpenwaService } from './openwa.service';
import { TenderNotificationService } from '../modules/tendering/tender-notification.service';
import { OperationNotificationService } from '../modules/operations/operation-notification.service';
import { PublicNotificationsModule } from '../modules/public-notifications/public-notifications.module';

@Global()
@Module({
  imports: [ConfigModule.forFeature(openwaConfig), PublicNotificationsModule],
  providers: [OpenwaService, TenderNotificationService, OperationNotificationService],
  exports: [OpenwaService, TenderNotificationService, OperationNotificationService],
})
export class OpenwaModule {}