import { Body, Controller, Delete, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";
import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import {
    createFollowUpSchema,
    followUpQuerySchema,
    updateFollowUpStatusSchema,
    type CreateFollowUpDto,
    type UpdateFollowUpStatusDto,
} from "@/modules/follow-up/dto";
import { assertLiveMailAllowed } from "@/modules/follow-up/follow-up.mail-environment";

const FOLLOWUP_PERMISSION_MODULE = "shared.followups";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("follow-up")
export class FollowUpController {
    constructor(private readonly service: FollowUpService) {}

    // CREATE
    @Post()
    @CanCreate(FOLLOWUP_PERMISSION_MODULE)
    async create(@Body() body: unknown, @CurrentUser() user: ValidatedUser) {
        const dto = createFollowUpSchema.parse(body) as CreateFollowUpDto;
        return this.service.create({ ...dto, createdById: user.sub }, user.sub);
    }

    // FIND ALL (WITH FILTERS)
    @Get()
    @CanRead(FOLLOWUP_PERMISSION_MODULE)
    async findAll(
        @Query("tab") tab?: string,
        @Query("assignedToId") assignedToId?: string,
        @Query("createdById") createdById?: string,
        @Query("search") search?: string,
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "asc" | "desc",
        @CurrentUser() user?: ValidatedUser
    ) {
        const query = followUpQuerySchema.parse({
            tab,
            assignedToId,
            createdById,
            search,
            page,
            limit,
            sortBy,
            sortOrder,
        });
        return this.service.findAll(query, user);
    }

    // DASHBOARD COUNTS (must be declared before :id)
    @Get("dashboard/counts")
    @CanRead(FOLLOWUP_PERMISSION_MODULE)
    async getCounts(@CurrentUser() currentUser: ValidatedUser) {
        return this.service.getCounts(currentUser);
    }

    // AMOUNT SUMMARY (DASHBOARD)
    @Get("dashboard/amount-summary")
    @CanRead(FOLLOWUP_PERMISSION_MODULE)
    async getAmountSummary(@CurrentUser() currentUser: ValidatedUser) {
        return this.service.getAmountSummary(currentUser);
    }

    // MAIL PREVIEWS
    @Get("preview-mail/:emdId")
    @CanRead(FOLLOWUP_PERMISSION_MODULE)
    async previewEmdMail(@Param("emdId", ParseIntPipe) emdId: number) {
        return this.service.getPreviewHtml(emdId);
    }

    @Get("test-followup/:id")
    @CanUpdate(FOLLOWUP_PERMISSION_MODULE)
    async test(@Param("id") id: number) {
        assertLiveMailAllowed();
        await this.service.processFollowupMail(id);
        return "Triggered";
    }

    // FIND ONE
    @Get(":id")
    @CanRead(FOLLOWUP_PERMISSION_MODULE)
    async findOne(@Param("id", ParseIntPipe) id: number) {
        const followUp = await this.service.findOne(id);

        if (!followUp) {
            throw new NotFoundException("Follow-up not found");
        }

        return followUp;
    }

    // UPDATE (FULL FORM)
    @Put(":id")
    @CanUpdate(FOLLOWUP_PERMISSION_MODULE)
    async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: Record<string, any>,
        @CurrentUser() user: ValidatedUser
    ) {
        const attachments = Array.isArray(body.attachments) ? body.attachments : [];
        const proofImage = body.proofImage ?? null;
        const dto = { ...body };
        delete dto.attachments;
        delete dto.proofImage;

        return this.service.update(id, dto, attachments, proofImage, user);
    }

    // UPDATE STATUS (QUICK MODAL)
    @Put(":id/status")
    @CanUpdate(FOLLOWUP_PERMISSION_MODULE)
    async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() body: Record<string, any>, @CurrentUser() user: ValidatedUser) {
        const proofImage = body?.proofImage ?? null;
        const dto = { ...body };
        delete dto.proofImage;

        const parsed = updateFollowUpStatusSchema.parse(dto) as UpdateFollowUpStatusDto;
        return this.service.updateStatus(id, parsed, user, proofImage);
    }

    // DELETE (SOFT DELETE)
    @Delete(":id")
    @CanDelete(FOLLOWUP_PERMISSION_MODULE)
    async remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: ValidatedUser) {
        return this.service.delete(id, user.sub);
    }
}
