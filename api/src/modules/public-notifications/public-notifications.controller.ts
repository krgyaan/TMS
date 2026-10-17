import { Controller, Get, Param } from "@nestjs/common";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { PublicNotificationsService } from "./public-notifications.service";

@Controller("public-notifications")
export class PublicNotificationsController {
    constructor(private readonly notifications: PublicNotificationsService) {}

    @Get(":token")
    @Public()
    getByToken(@Param("token") token: string) {
        return this.notifications.getByToken(token);
    }
}
