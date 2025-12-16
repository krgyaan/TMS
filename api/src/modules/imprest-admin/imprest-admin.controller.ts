import { Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards, Body } from "@nestjs/common";

import { ImprestAdminService } from "./imprest-admin.service";
import { Roles } from "@/modules/auth/decorators/roles.decorator";
import { RolesGuard } from "@/modules/auth/guards/roles.guard";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators";

@Controller("accounts/imprest")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImprestAdminController {
    constructor(private readonly service: ImprestAdminService) {}

    /**
     * ADMIN / ACCOUNT:
     * Employee Imprest Summary
     */
    @Get()
    @Roles("admin", "account", "Super User")
    async getEmployeeImprestSummary() {
        return this.service.getEmployeeSummary();
    }

    // ========================
    // GET PAYMENT HISTORY (BY USER)
    // ========================
    @Get("payment-history/:userId")
    async getByUser(@Param("userId", ParseIntPipe) userId: number, @CurrentUser() user) {
        // employee can only view their own history
        if (user.role === "employee" && user.id !== userId) {
            throw new ForbiddenException("Access denied");
        }

        return this.service.getByUser(userId);
    }

    // ========================
    // LIST VOUCHERS
    // ========================
    @Get("voucher")
    async listVouchers(@Req() req, @Query("page") page = "1", @Query("limit") limit = "10") {
        return this.service.listVouchers({
            user: req.user,
            page: Number(page),
            limit: Number(limit),
        });
    }

    // ========================
    // CREATE VOUCHER
    // ========================

    @Post("voucher")
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

    @Get("voucher/:id")
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
    @Roles("admin", "account")
    async delete(@Param("id", ParseIntPipe) id: number) {
        return this.service.delete(id);
    }
}
