import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { MakerRequestService } from "./maker-request.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

@Controller("maker-requests")
export class MakerRequestController {
    constructor(private readonly service: MakerRequestService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.create(body, user.id);
    }

    @Get("my")
    getMyRequests(@CurrentUser() user: ValidatedUser) {
        return this.service.getByUser(user.id);
    }

    @Get()
    getAll() {
        return this.service.getAll();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Patch(":id/status")
    @HttpCode(HttpStatus.OK)
    updateStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        return this.service.updateStatus(id, body);
    }
}
