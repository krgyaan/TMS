import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { ConferenceService } from "./conference.service";
import { CreateConferenceCallReportSchema, UpdateConferenceCallReportSchema } from "./dto/conference.dto";

@Controller("conference")
export class ConferenceController {
    constructor(private readonly service: ConferenceService) {}

    @Get()
    list(@Query("complaintId") complaintId?: string) {
        return this.service.list(complaintId ? Number(complaintId) : undefined);
    }

    @Get("list")
    getJoinedList() {
        return this.service.getJoinedList();
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Get("complaint/:complaintId")
    getByComplaintId(@Param("complaintId", ParseIntPipe) complaintId: number) {
        return this.service.getByComplaintId(complaintId);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(CreateConferenceCallReportSchema)) body: any, @Req() req: any) {
        return this.service.create(body, req.user?.id ?? req.user?.sub);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(@Param("id", ParseIntPipe) id: number, @Body(new ZodValidationPipe(UpdateConferenceCallReportSchema)) body: any) {
        return this.service.update(id, body);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
