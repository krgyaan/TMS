import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req } from "@nestjs/common";

import { CurrentUser } from "@/decorators/current-user.decorator";
import { CourierService } from "@/modules/courier/courier.service";
import {
    CourierDashboardQuerySchema,
    CreateCourierSchema,
    CreateDispatchSchema,
    UpdateCourierSchema,
    UpdateCourierStatusSchema,
    type CreateCourierDto,
    type UpdateCourierInput,
} from "@/modules/courier/dto";

import { ZodValidationPipe } from "nestjs-zod";
import { CanDelete } from "../auth/decorators";

// $statusMap = [
//     'dispatched' => ['1'],
//     'not_delivered' => ['2', '3'],
//     'delivered' => ['4'],
//     'rejected' => ['5'],
// ];

@Controller("couriers")
export class CourierController {
    constructor(private readonly service: CourierService) {}

    @Post()
    create(@Body(new ZodValidationPipe(CreateCourierSchema)) dto: CreateCourierDto, @CurrentUser() user: any) {
        return this.service.create(dto, user.sub);
    }

    @Post(":id/dispatch")
    createDispatch(@Param("id", ParseIntPipe) id: number, @Req() req: Request, @CurrentUser("id") userId: number) {
        const parsed = CreateDispatchSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        console.log("createDispatch parsed body:", parsed.data);

        return this.service.createDispatch(id, parsed.data, userId);
    }

    // Update dispatch info
    @Patch(":id/dispatch")
    updateDispatch(@Param("id", ParseIntPipe) id: number, @Req() req: Request, @CurrentUser("id") userId: number) {
        const parsed = CreateDispatchSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.updateDispatch(id, parsed.data, userId);
    }

    // Get all couriers for logged-in user
    @Get()
    getMyCouriers(@CurrentUser("id") userId: number) {
        return this.service.findAllByUser(userId);
    }

    // Get all couriers (admin/dashboard)
    @Get("all")
    getAllCouriers() {
        // return "Hey";
        console.log("getAllCouriers called");
        return this.service.findAll();
    }

    // Get paginated couriers for the dashboard (search + sort + tab)
    @Get("dashboard")
    getDashboardData(@Query() query: Record<string, string>) {
        const parsed = CourierDashboardQuerySchema.parse(query);
        return this.service.getDashboard(parsed);
    }

    // Get dashboard counts grouped by tab status
    @Get("dashboard/counts")
    getDashboardCounts() {
        return this.service.getDashboardCounts();
    }

    // Get couriers by status
    @Get("status/:status")
    getByStatus(@Param("status", ParseIntPipe) status: number) {
        return this.service.findByStatus(status);
    }

    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Get(":id/details")
    getOneWithDetails(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOneWithDetails(id);
    }

    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateCourierSchema))
        body: UpdateCourierInput,
        @CurrentUser("id") userId: number
    ) {
        return this.service.update(id, body, userId);
    }

    // Update status
    @Patch(":id/status")
    updateStatus(@Param("id", ParseIntPipe) id: number, @Req() req: Request) {
        const parsed = UpdateCourierStatusSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.updateStatus(id, parsed.data);
    }

    @Delete(":id")
    @CanDelete("shared.couriers")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser("id") userId: number) {
        return this.service.delete(id, userId);
    }

    @Post(":id/upload")
    uploadDocs(@Param("id", ParseIntPipe) id: number, @Body() body: { filenames: string[] }, @CurrentUser("id") userId: number) {
        const filenames = Array.isArray(body?.filenames) ? body.filenames : [];
        return this.service.uploadDocs(id, filenames, userId);
    }

    @Post(":id/upload-pod")
    uploadDeliveryPod(@Param("id", ParseIntPipe) id: number, @Body() body: { filename: string }, @CurrentUser("id") userId: number) {
        return this.service.uploadDeliveryPod(id, body?.filename, userId);
    }
}
