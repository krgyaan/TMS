import type { NotificationChannel as NotificationChannelValue, NotificationRequest, NotificationResult } from "../dto/notification.dto";
import type { DomainResolution } from "../domain/domain.registry";

/**
 * A transport channel (email, whatsapp, ...) capable of delivering a
 * notification. Implementations receive the fully resolved request after the
 * dispatcher has applied domain strategy + dev override, plus the resolved
 * reference/label info for threading.
 */
export interface NotificationChannel {
    readonly channel: NotificationChannelValue;

    send(request: NotificationRequest, resolution?: DomainResolution): Promise<NotificationResult>;
}
