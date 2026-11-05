import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { PermissionGuard } from "@/modules/auth/guards/permission.guard";
import { CanCreate, CanDelete, CanRead, CanUpdate } from "@/modules/auth/decorators/permissions.decorator";
import { FixedExpensesService } from "./fixed-expenses.service";
import { archiveFixedExpenseSchema, createFixedExpenseSchema, fixedExpenseQuerySchema, updateFixedExpenseSchema } from "./dto/fixed-expenses.dto";

const PERMISSION_MODULE = "accounts.fixed-expenses";

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("fixed-expenses")
export class FixedExpensesController {
    constructor(private readonly fixedExpensesService: FixedExpensesService) {}

    @Get()
    @CanRead(PERMISSION_MODULE)
    async list(
        @Query("page") page?: string,
        @Query("limit") limit?: string,
        @Query("search") search?: string,
        @Query("type") type?: string,
        @Query("paymentFrequency") paymentFrequency?: string,
        @Query("paymentMode") paymentMode?: string,
        @Query("amountType") amountType?: string,
        @Query("status") status?: string,
        @Query("deleteStatus") deleteStatus?: string,
        @Query("sortBy") sortBy?: string,
        @Query("sortOrder") sortOrder?: "asc" | "desc"
    ) {
        const filters = fixedExpenseQuerySchema.parse({
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
            type,
            paymentFrequency,
            paymentMode,
            amountType,
            status,
            deleteStatus,
            sortBy,
            sortOrder,
        });

        return this.fixedExpensesService.findAll(filters);
    }

    @Get(":id/history")
    @CanRead(PERMISSION_MODULE)
    async getHistory(@Param("id", ParseIntPipe) id: number) {
        return this.fixedExpensesService.getHistory(id);
    }

    @Get(":id")
    @CanRead(PERMISSION_MODULE)
    async getById(@Param("id", ParseIntPipe) id: number) {
        return this.fixedExpensesService.findById(id);
    }

    @Post()
    @CanCreate(PERMISSION_MODULE)
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() body: unknown, @CurrentUser("id") userId: number) {
        const parsed = createFixedExpenseSchema.parse(body);
        return this.fixedExpensesService.create(parsed, userId);
    }

    @Patch(":id")
    @CanUpdate(PERMISSION_MODULE)
    async update(@Param("id", ParseIntPipe) id: number, @Body() body: unknown, @CurrentUser("id") userId: number) {
        const parsed = updateFixedExpenseSchema.parse(body);
        return this.fixedExpensesService.update(id, parsed, userId);
    }

    @Patch(":id/archive")
    @CanDelete(PERMISSION_MODULE)
    async archive(@Param("id", ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = archiveFixedExpenseSchema.parse(body);
        return this.fixedExpensesService.setArchiveStatus(id, parsed.deleteStatus);
    }

    @Delete(":id")
    @CanDelete(PERMISSION_MODULE)
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param("id", ParseIntPipe) id: number) {
        await this.fixedExpensesService.delete(id);
    }
}
