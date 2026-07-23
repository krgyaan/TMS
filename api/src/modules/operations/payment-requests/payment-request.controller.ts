import { Controller, Get, Post, Put, Patch, Param, Body, Query, ParseIntPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { PaymentRequestService } from "./payment-request.service";
import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import type { ValidatedUser } from "@/modules/auth/strategies/jwt.strategy";

@Controller("project-payment-requests")
export class PaymentRequestController {
    constructor(private readonly service: PaymentRequestService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() body: any, @CurrentUser() user: ValidatedUser) {
        return this.service.create(body, user.id);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        return this.service.update(id, body);
    }

    @Get("next-number")
    getNextNumber(@Query("projectName") projectName: string) {
        return this.service.generateNumber(projectName);
    }

    @Get("project/:projectId")
    getByProject(@Param("projectId", ParseIntPipe) projectId: number) {
        return this.service.getByProject(projectId);
    }

    @Get()
    getAll(@Query("teamId") teamId?: string, @Query("type") type?: 'project' | 'maker') {
        return this.service.getAll(teamId ? Number(teamId) : undefined, type);
    }

    @Patch(":id/status")
    @HttpCode(HttpStatus.OK)
    updateStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        return this.service.updateStatus(id, body);
    }

    // ── Beneficiary routes (must be before :id routes) ──

    @Post("beneficiaries")
    @HttpCode(HttpStatus.CREATED)
    createBeneficiary(@Body() body: any) {
        return this.service.createBeneficiary(body);
    }

    @Get("beneficiaries")
    listBeneficiaries() {
        return this.service.listBeneficiaries();
    }

    @Get("beneficiaries/:id")
    getBeneficiary(@Param("id", ParseIntPipe) id: number) {
        return this.service.getBeneficiary(id);
    }

    @Put("beneficiaries/:id")
    updateBeneficiary(
        @Param("id", ParseIntPipe) id: number,
        @Body() body: any,
    ) {
        return this.service.updateBeneficiary(id, body);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }
}
