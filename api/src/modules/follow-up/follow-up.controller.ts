import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    ParseIntPipe,
    Req,
    NotFoundException,
    UseInterceptors,
    UploadedFiles,
    ConsoleLogger,
    UploadedFile,
} from "@nestjs/common";

import { FollowUpService } from "@/modules/follow-up/follow-up.service";
import { CurrentUser } from "@/decorators/current-user.decorator";

import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import type { CreateFollowUpDto, UpdateFollowUpDto, UpdateFollowUpStatusDto, FollowUpQueryDto } from "@/modules/follow-up/zod";

const followUpAttachmentsMulterConfig = {
    storage: diskStorage({
        destination: "./uploads/accounts",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `fu-${uniqueSuffix}${ext}`);
        },
    }),
};

const proofImageMulterConfig = {
    storage: diskStorage({
        destination: "./uploads/accounts",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `fu-pi-${uniqueSuffix}${ext}`);
        },
    }),
};

@Controller("follow-up")
export class FollowUpController {
    constructor(private readonly service: FollowUpService) {}

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
        const staticUser = {
            id: 3,
            role: "admin",
        };

        let data = await this.service.findAll(query, staticUser);
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
    @UseInterceptors(FilesInterceptor("attachments", 10, followUpAttachmentsMulterConfig))
    async update(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req, @UploadedFiles() attachments: Express.Multer.File[]) {
        const res = this.service.update(id, dto, attachments, req.user);
        return res;
    }

    // ========================
    // UPDATE STATUS (QUICK MODAL)
    // ========================

    @Put(":id/status")
    @UseInterceptors(FileInterceptor("proofImage", proofImageMulterConfig))
    async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() dto: UpdateFollowUpStatusDto, @Req() req, @UploadedFile() proofImage: Express.Multer.File) {
        console.log("Entering API Call");
        console.log({ id, dto, proofImage });
        return this.service.updateStatus(id, dto, req.user, proofImage);
    }

    // ========================
    // DELETE (SOFT DELETE)
    // ========================
    @Delete(":id")
    async remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    @Get("test-followup/:id")
    async test(@Param("id") id: number) {
        await this.service.processFollowupMail(id);
        return "Triggered";
    }

    // ========================
    // AMOUNT SUMMARY (DASHBOARD)
    // ========================

    @Get("dashboard/amount-summary")
    async getAmountSummary(@CurrentUser() currentUser: { id: number; role: string }) {
        return this.service.getAmountSummary(currentUser);
    }
}
