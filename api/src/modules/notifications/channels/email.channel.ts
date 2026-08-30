import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "@/modules/email/email.service";
import type { NotificationChannel as NotificationChannelValue, NotificationRequest, NotificationResult } from "../dto/notification.dto";
import type { DomainResolution } from "../domain/domain.registry";
import type { NotificationChannel } from "./notification-channel.interface";

/**
 * Email transport over the consolidated `EmailService.send` core. By the time
 * this channel runs, the dispatcher has already applied the domain strategy and
 * the dev override, so `request.fromUserId` / `request.to` are final.
 */
@Injectable()
export class EmailNotificationChannel implements NotificationChannel {
    readonly channel: NotificationChannelValue = "email";
    private readonly logger = new Logger(EmailNotificationChannel.name);

    constructor(private readonly emailService: EmailService) {}

    async send(request: NotificationRequest, resolution: DomainResolution): Promise<NotificationResult> {
        this.logger.log(`Dispatching email domain=${request.domain} ref=${resolution.referenceType}:${resolution.referenceId} event=${request.eventType}`);

        return this.emailService.send({
            referenceType: resolution.referenceType,
            referenceId: resolution.referenceId,
            eventType: request.eventType,
            fromUserId: request.fromUserId,
            to: request.to,
            cc: request.cc,
            subject: request.subject,
            template: request.template,
            data: {
                ...resolution.extraData,
                ...request.data,
            },
            labelPath: resolution.labelPath,
            attachments: request.attachments,
        });
    }
}
