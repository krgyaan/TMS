import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { CanDelete, CanRead, CanUpdate, CurrentUser } from "../auth/decorators";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { PermissionService } from "../auth/services/permission.service";
import { ImprestAdminService } from "./imprest-admin.service";
import { CreateEmployeeImprestCreditSchema } from "./zod/create-employee-imprest-credit.schema";

@Controller("imprest")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ImprestAdminController {
    constructor(
        private readonly service: ImprestAdminService,
        private readonly permissionService: PermissionService
    ) {}

    @Get()
    @CanRead("shared.imprests")
    async getEmployeeImprestSummary() {
        return this.service.getEmployeeSummary();
    }

    @Get("payment-history")
    async getPaymentHistory(@CurrentUser() user: any, @Query("userId") userId?: number) {
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
            return this.service.getPaymentHistory(userId);
        }
        return this.service.getPaymentHistory(user.sub);
    }

    @Delete("payment-history/:id")
    @CanDelete("accounts.imprests")
    async deletePaymentHistory(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: any) {
        return this.service.deletePaymentHistory({
            transactionId: id,
            deletedBy: user.sub,
        });
    }

    @Get("voucher")
    async listVouchers(
        @CurrentUser() user: any,
        @Query("userId") userId?: number,
        @Query("page") page?: number,
        @Query("limit") limit?: number,
        @Query("search") search?: string,
        @Query("fy") fy?: number
    ) {
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

        const effectiveUserId = canReadAll ? (userId ? Number(userId) : undefined) : (user.sub as number);

        return this.service.listVouchersRaw(effectiveUserId, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            search,
            fy: fy ? Number(fy) : undefined,
        });
    }

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

    @Get("voucher/view")
    async getVoucherView(@Query("userId", ParseIntPipe) userId: number, @Query("from") from: string, @Query("to") to: string, @Req() req) {
        const parsedFrom = new Date(decodeURIComponent(from));
        const parsedTo = new Date(decodeURIComponent(to));

        if (isNaN(parsedFrom.getTime()) || isNaN(parsedTo.getTime())) {
            throw new BadRequestException("Invalid date range");
        }

        return this.service.getVoucherByPeriod({
            user: req.user,
            userId,
            from: parsedFrom,
            to: parsedTo,
        });
    }

    @Get("voucher/proofs")
    async getVoucherProofs(@Query("userId", ParseIntPipe) userId: number, @Query("year", ParseIntPipe) year: number, @Query("week", ParseIntPipe) week: number, @Req() req) {
        return this.service.getVoucherProofs({
            user: req.user,
            userId,
            year,
            week,
        });
    }

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
