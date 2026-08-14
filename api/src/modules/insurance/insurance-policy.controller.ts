import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";

type AuthedRequest = Request & { user?: { sub?: number } };
import { InsurancePolicyService } from "./insurance-policy.service";
import { createInsurancePolicySchema, updateInsurancePolicySchema } from "./zod/insurance-policy.schema";

@Controller("insurance-policies")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class InsurancePolicyController {
    constructor(private readonly service: InsurancePolicyService) {}

    @Get()
    @CanRead("accounts.insurance")
    findAll(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("status") status?: string,
        @Query("insuranceType") insuranceType?: string
    ) {
        return this.service.findAll({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search,
            status,
            insuranceType,
        });
    }

    @Get(":id")
    @CanRead("accounts.insurance")
    findOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Post()
    @CanCreate("accounts.insurance")
    create(@Req() req: AuthedRequest, @Body() body: unknown) {
        const parsed = createInsurancePolicySchema.safeParse(body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.create(parsed.data, req.user?.sub ?? 0);
    }

    @Patch(":id")
    @CanUpdate("accounts.insurance")
    update(@Param("id", ParseIntPipe) id: number, @Req() req, @Body() body: unknown) {
        const parsed = updateInsurancePolicySchema.safeParse(body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.update(id, parsed.data);
    }

    @Delete(":id")
    @CanDelete("accounts.insurance")
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
