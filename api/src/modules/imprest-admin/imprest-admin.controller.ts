import { Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards, Body, BadRequestException } from "@nestjs/common";

import { ImprestAdminService } from "./imprest-admin.service";
import { Roles } from "@/modules/auth/decorators/roles.decorator";
import { RolesGuard } from "@/modules/auth/guards/roles.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CanDelete, CanRead, CanUpdate, CurrentUser } from "../auth/decorators";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { CreateEmployeeImprestCreditSchema } from "./zod/create-employee-imprest-credit.schema";
import { PermissionService, UserPermissionContext } from "../auth/services/permission.service";

import { ValidatedUser } from "../auth/strategies/jwt.strategy";

@Controller("accounts/imprest")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ImprestAdminController {
    constructor(
        private readonly service: ImprestAdminService,
        private readonly permissionService: PermissionService
    ) {}

    /**
     * ADMIN / ACCOUNT:
     * Employee Imprest Summary
     */
    @Get()
    @CanRead("shared.imprests")
    async getEmployeeImprestSummary() {
        return this.service.getEmployeeSummary();
    }

    // ========================
    // GET PAYMENT HISTORY (BY USER)
    // ========================
    @Get("payment-history/:userId")
    async getByUser(@Param("userId", ParseIntPipe) userId: number, @CurrentUser() user) {
        // employee can only view their own history
        // if (user.role === "employee" && user.id !== userId) {
        //     throw new ForbiddenException("Access denied");
        // }

        return this.service.getByUser(userId);
    }

    // ========================
    // LIST VOUCHERS
    // ========================

    @Get("voucher")
    async listVouchers(@CurrentUser() user: any, @Query("userId") userId?: number) {
        const canReadAll = await this.permissionService.hasPermission(
            {
                userId: user.sub,
                roleId: user.roleId,
                roleName: user.role,
                teamId: user.teamId,
                dataScope: user.dataScope,
            },
            { module: "accounts.imprests", action: "read" }
        );

        if (canReadAll) {
            return this.service.listVouchersRaw(userId);
        }

        return this.service.listVouchersRaw(user.sub);
    }

    // ========================
    // CREATE VOUCHER
    // ========================

    @Post("voucher")
    @CanUpdate("accounts.imprests")
    async createVoucher(@Req() req, @Body() body) {
        return this.service.createVoucher({
            user: req.user,
            userId: body.userId,
            validFrom: body.validFrom,
            validTo: body.validTo,
        });
    }

    //=========================
    // VIEW VOUCHER BY ID
    //=========================

    @Get("voucher/view/:id")
    async getVoucherById(@Param("id", ParseIntPipe) id: number, @Req() req) {
        return this.service.getVoucherById({
            user: req.user,
            voucherId: Number(id),
        });
    }

    // ========================
    // APPROVE VOUCHER
    // ========================
    @Post("voucher/:id/account-approve")
    @CanUpdate("accounts.imprests")
    accountApprove(@Req() req, @Param("id") id: string, @Body() body: { remark?: string; approve?: boolean }) {
        return this.service.accountApproveVoucher({
            user: req.user,
            voucherId: Number(id),
            remark: body.remark,
            approve: !!body.approve,
        });
    }

    // =========================
    // ADMIN APPROVE VOUCHER
    // ========================
    @Post("voucher/:id/admin-approve")
    @CanUpdate("accounts.imprests")
    adminApprove(@Req() req, @Param("id") id: string, @Body() body: { remark?: string; approve?: boolean }) {
        return this.service.adminApproveVoucher({
            user: req.user,
            voucherId: Number(id),
            remark: body.remark,
            approve: !!body.approve,
        });
    }

    // ========================
    // DELETE TRANSACTION Payment History
    // ========================
    @Delete("/:id")
    @CanDelete("accounts.imprests")
    async delete(@Param("id", ParseIntPipe) id: number) {
        return this.service.delete(id);
    }

    @Post("credit")
    @CanDelete("accounts.imprests")
    creditImprest(@Req() req) {
        const parsed = CreateEmployeeImprestCreditSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.creditImprest(
            parsed.data,
            req.user.sub // admin who paid
        );
    }
}
