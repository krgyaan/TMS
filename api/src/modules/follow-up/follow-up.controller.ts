import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, Req, NotFoundException } from "@nestjs/common";

import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import { CurrentUser } from "@/decorators/current-user.decorator";

import type { CreateFollowUpDto, UpdateFollowUpDto, UpdateFollowUpStatusDto, FollowUpQueryDto } from "@/modules/follow-up/zod";

@Controller("follow-up")
export class FollowUpController {
    constructor(private readonly service: FollowUpService) { }

    // ========================
    // CREATE
    // ========================

    @Post()
    async create(@Body() dto: CreateFollowUpDto, @Req() req) {
        console.log("Follow up called");
        return this.service.create(dto, req.user.id);
    }

    // ========================
    // FIND ALL (WITH FILTERS)
    // ========================

    @Get()
    async findAll(@Query() query: FollowUpQueryDto, @CurrentUser() user) {
        console.log("Follow up Called");

        const staticUser = {
            id: 3,
            role: "admin",
        };

        let data = await this.service.findAll(query, staticUser);
        console.log(data);
        return data;
    }

    // ========================
    // FIND ONE
    // ========================
    @Get(":id")
    async findOne(@Param("id", ParseIntPipe) id: number) {
        const followUp = await this.service.findOne(id);

        if (!followUp) {
            throw new NotFoundException("Follow-up not found");
        }

        return followUp;
    }

    // ========================
    // UPDATE (FULL FORM)
    // ========================

    @Put(":id")
    async update(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateFollowUpDto, @Req() req) {
        console.log("Gyan is tharki!");
        return this.service.update(id, dto, req.user);
    }

    // ========================
    // UPDATE STATUS (QUICK MODAL)
    // ========================

    @Put(":id/status")
    async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateFollowUpStatusDto, @Req() req) {
        console.log("Entering API Call");
        console.log(req);
        return this.service.updateStatus(id, dto, req.user);
    }

    // ========================
    // DELETE (SOFT DELETE)
    // ========================

    @Delete(":id")
    async remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    // ========================
    // AMOUNT SUMMARY (DASHBOARD)
    // ========================

    @Get("dashboard/amount-summary")
    async getAmountSummary(@CurrentUser() currentUser: { id: number; role: string }) {
        return this.service.getAmountSummary(currentUser);
    }
}
