import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { UrlShortenerService } from "./url-shortener.service";

@Controller("url-shortener")
export class UrlShortenerController {
    constructor(private readonly shortener: UrlShortenerService) {}

    @Get(":token")
    @Public()
    resolve(@Param("token") token: string) {
        return this.shortener.resolveOrThrow(token);
    }
}
