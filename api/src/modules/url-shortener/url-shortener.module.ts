import { Module } from "@nestjs/common";
import { UrlShortenerController } from "./url-shortener.controller";
import { UrlShortenerService } from "./url-shortener.service";

/**
 * Generic URL shortener: `shorten(url)` stores the target and returns
 * `<PUBLIC_APP_URL>/n/<token>`; `GET /api/v1/url-shortener/:token` resolves it
 * for the web redirect page at `/n/:token`.
 */
@Module({
    controllers: [UrlShortenerController],
    providers: [UrlShortenerService],
    exports: [UrlShortenerService],
})
export class UrlShortenerModule {}
