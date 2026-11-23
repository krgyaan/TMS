import { CanRead, CanUpdate } from "@/modules/auth/decorators";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import type { TallyConfig } from "@/config/tally.config";
import { TALLY_CONFIG } from "../tally.constants";
import { TallyLedgersService } from "./tally-ledgers.service";
import { TallyUserLedgersService } from "./tally-user-ledgers.service";

const LedgerListQuerySchema = z.object({
    q: z.string().trim().optional(),
    parent: z.string().trim().optional(),
    active: z.enum(["true", "false"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
});

const UserLedgerLinkSchema = z
    .object({
        imprestLedgerId: z.number().int().positive().nullable().optional(),
        salaryLedgerId: z.number().int().positive().nullable().optional(),
        salaryPayableLedgerId: z.number().int().positive().nullable().optional(),
    })
    .strict();

@Controller("tally")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TallyLedgersController {
    constructor(
        private readonly ledgersService: TallyLedgersService,
        private readonly userLedgersService: TallyUserLedgersService,
        @Inject(TALLY_CONFIG) private readonly config: TallyConfig
    ) {}

    @Get("ledgers")
    @CanRead("integrations")
    async list(@Query() query: unknown) {
        const parsed = LedgerListQuerySchema.parse(query);

        return this.ledgersService.list({
            company: this.company(),
            q: parsed.q,
            parent: parsed.parent,
            active: parsed.active === undefined ? undefined : parsed.active === "true",
            page: parsed.page,
            limit: parsed.limit,
        });
    }

    @Post("ledgers/sync")
    @HttpCode(HttpStatus.OK)
    @CanUpdate("integrations")
    async sync() {
        return this.ledgersService.sync(this.company());
    }

    @Get("user-ledgers/:userId")
    @CanRead("integrations")
    async getForUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.userLedgersService.getForUser(userId, this.company());
    }

    @Put("user-ledgers/:userId")
    @CanUpdate("integrations")
    async setForUser(@Param("userId", ParseIntPipe) userId: number, @Body() body: unknown) {
        const parsed = UserLedgerLinkSchema.parse(body);

        return this.userLedgersService.setForUser(userId, parsed, this.company());
    }

    @Delete("user-ledgers/:userId")
    @CanUpdate("integrations")
    async clearForUser(@Param("userId", ParseIntPipe) userId: number) {
        return this.userLedgersService.clearForUser(userId, this.company());
    }

    private company(): string {
        if (!this.config.company) {
            throw new BadRequestException("TALLY_COMPANY is not configured");
        }

        return this.config.company;
    }
}
