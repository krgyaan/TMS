import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import authConfig from "@/config/auth.config";
import { UrlShortenerModule } from "@/modules/url-shortener/url-shortener.module";
import { PublicNotificationsController } from "./public-notifications.controller";
import { PublicNotificationsService } from "./public-notifications.service";
import { PublicLinkService } from "./public-link.service";
import { ENTITY_RESOLVERS, ENTITY_RESOLVER_MAP } from "./entity-resolvers";

/**
 * Public, token-gated detail page for notifications.
 *
 * - `PublicLinkService` (exported) builds signed `<PUBLIC_APP_URL>/notify/<token>`
 *   links for WhatsApp/email messages, shortened via `UrlShortenerModule` to
 *   `<PUBLIC_APP_URL>/n/<short-token>` (falls back to the full link on failure).
 * - `GET /api/v1/public-notifications/:token` serves the entity payload to the
 *   unauthenticated web page at `/notify/:token`.
 */
@Module({
    imports: [JwtModule.register({}), ConfigModule.forFeature(authConfig), UrlShortenerModule],
    controllers: [PublicNotificationsController],
    providers: [PublicLinkService, PublicNotificationsService, { provide: ENTITY_RESOLVERS, useValue: ENTITY_RESOLVER_MAP }],
    exports: [PublicLinkService, PublicNotificationsService],
})
export class PublicNotificationsModule {}
