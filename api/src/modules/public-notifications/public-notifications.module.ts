import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import authConfig from "@/config/auth.config";
import { PublicNotificationsController } from "./public-notifications.controller";
import { PublicNotificationsService } from "./public-notifications.service";
import { PublicLinkService } from "./public-link.service";
import { ENTITY_RESOLVERS, ENTITY_RESOLVER_MAP } from "./entity-resolvers";

/**
 * Public, token-gated detail page for notifications.
 *
 * - `PublicLinkService` (exported) builds signed `<PUBLIC_APP_URL>/notify/<token>`
 *   links for WhatsApp/email messages.
 * - `GET /api/v1/public-notifications/:token` serves the entity payload to the
 *   unauthenticated web page at `/notify/:token`.
 */
@Module({
    imports: [JwtModule.register({}), ConfigModule.forFeature(authConfig)],
    controllers: [PublicNotificationsController],
    providers: [PublicLinkService, PublicNotificationsService, { provide: ENTITY_RESOLVERS, useValue: ENTITY_RESOLVER_MAP }],
    exports: [PublicLinkService, PublicNotificationsService],
})
export class PublicNotificationsModule {}
