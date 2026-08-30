import { Injectable, Logger } from "@nestjs/common";
import { OpenwaService } from "@/openwa/openwa.service";
import { GROUPS } from "@config/groups";
import type { NotificationChannel as NotificationChannelValue, NotificationRequest, NotificationResult, WhatsappOptions } from "../dto/notification.dto";
import { WhatsappJidResolver } from "../helpers/whatsapp-jid.resolver";
import type { NotificationChannel } from "./notification-channel.interface";

/**
 * WhatsApp transport stub.
 *
 * Phase 1 only supports the `email` channel, so this channel is never invoked
 * by the dispatcher. It is structured so that enabling `channel: 'whatsapp'`
 * (or `both`) later only requires wiring the target resolution below.
 */
@Injectable()
export class WhatsappNotificationChannel implements NotificationChannel {
    readonly channel: NotificationChannelValue = "email";
    private readonly logger = new Logger(WhatsappNotificationChannel.name);

    constructor(
        private readonly openwa: OpenwaService,
        private readonly jidResolver: WhatsappJidResolver
    ) {}

    send(request: NotificationRequest): Promise<NotificationResult> {
        this.logger.warn(`WhatsApp channel invoked but not enabled (request channel="${request.channel}"). This is a no-op.`);
        return Promise.resolve({ success: false, error: "WhatsApp channel not yet enabled." });
    }

    /** Resolve a WA target into a concrete chat id + mention jids. Future use. */
    private async resolveTarget(action: WhatsappOptions): Promise<{
        chatId: string;
        mentions?: string[];
    }> {
        const target = action.target;
        switch (target.kind) {
            case "group":
                return { chatId: GROUPS[target.group] };
            case "group_mention": {
                const mentions = (await Promise.all(target.mentionUserIds.map(id => this.jidResolver.toJid(id)))).filter((jid): jid is string => jid !== null);
                return { chatId: GROUPS[target.group], mentions };
            }
            case "user": {
                const jid = await this.jidResolver.toJid(target.userId);
                if (!jid) throw new Error(`Cannot resolve WhatsApp JID for user ${target.userId}`);
                return { chatId: jid };
            }
        }
    }
}
