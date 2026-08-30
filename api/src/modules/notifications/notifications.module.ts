import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailModule } from "@/modules/email/email.module";
import { NotificationsDispatcher } from "./notifications.dispatcher.service";
import { NotificationsDomainRegistry } from "./domain/domain.registry";
import { TenderDomainStrategy, PaymentRequestDomainStrategy } from "./domain/domain.registry";
import { EmailNotificationChannel } from "./channels/email.channel";
import { WhatsappNotificationChannel } from "./channels/whatsapp.channel";
import { WhatsappJidResolver } from "./helpers/whatsapp-jid.resolver";

/**
 * Global, additive notification layer. New modules should inject
 * `NotificationsDispatcher` for mail/WhatsApp notifications instead of
 * creating their own `*-notification.service.ts`.
 */
@Global()
@Module({
    imports: [ConfigModule, EmailModule],
    providers: [
        NotificationsDomainRegistry,
        TenderDomainStrategy,
        PaymentRequestDomainStrategy,
        EmailNotificationChannel,
        WhatsappNotificationChannel,
        WhatsappJidResolver,
        NotificationsDispatcher,
    ],
    exports: [NotificationsDispatcher, EmailNotificationChannel, WhatsappNotificationChannel, WhatsappJidResolver],
})
export class NotificationsModule {}
