import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Query, Req } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";
import { Public } from "@/modules/auth/decorators/public.decorator";
import { ServiceFeedbackService } from "./servicefeedback.service";
import { CreateServiceFeedbackSchema, UpdateServiceFeedbackSchema } from "./dto/service-feedback.dto";

@Controller("service-feedback")
export class ServiceFeedbackController {
    constructor(private readonly service: ServiceFeedbackService) {}

    @Get()
    list(@Query("complaintId") complaintId?: string) {
        return this.service.list(complaintId ? Number(complaintId) : undefined);
    }

    @Get("list")
    getJoinedList() {
        return this.service.getJoinedList();
    }

    @Get(":id")
    @Public()
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Get("complaint/:complaintId")
    @Public()
    getByComplaintId(@Param("complaintId", ParseIntPipe) complaintId: number) {
        return this.service.getByComplaintId(complaintId);
    }

    @Post()
    @Public()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(CreateServiceFeedbackSchema)) body: any, @Req() req: any) {
        return this.service.create(body, req.user?.id ?? req.user?.sub);
    }

    @Put(":id")
    @Public()
    @HttpCode(HttpStatus.OK)
    update(@Param("id", ParseIntPipe) id: number, @Body(new ZodValidationPipe(UpdateServiceFeedbackSchema)) body: any) {
        return this.service.update(id, body);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
