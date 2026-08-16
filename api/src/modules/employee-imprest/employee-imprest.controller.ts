import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { EmployeeImprestService, type ImprestActorUser } from "@/modules/employee-imprest/employee-imprest.service";
import { CreateEmployeeImprestSchema } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import { UpdateEmployeeImprestSchema, type UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";
import { ZodValidationPipe } from "nestjs-zod";

@Controller("imprest/employee")
export class EmployeeImprestController {
    constructor(private readonly service: EmployeeImprestService) {}

    @Post()
    create(@Req() req) {
        const parsed = CreateEmployeeImprestSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        const filenames = Array.isArray(req.body?.files) ? req.body.files : [];

        // Pass sender's userId from JWT — service resolves name from DB
        return this.service.createWithTransfer(parsed.data, filenames, req.user as ImprestActorUser);
    }

    @Get()
    getMyImprests(@Req() req, @Query("page") page?: string, @Query("limit") limit?: string, @Query("search") search?: string) {
        return this.service.getEmployeeDashboard(req.user.sub, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
        });
    }

    @Get("transactions")
    getMyTransactions(@Req() req) {
        return this.service.getTransactions(req.user.sub);
    }

    @Get("user/:userId")
    getByUser(@Param("userId", ParseIntPipe) userId: number, @Query("page") page?: string, @Query("limit") limit?: string, @Query("search") search?: string) {
        console.log("Fetching imprests for userId (controller):", userId);
        return this.service.getEmployeeDashboard(userId, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            search,
        });
    }

    @Get("user/:userId/transactions")
    getByUserTransactions(@Param("userId", ParseIntPipe) userId: number) {
        return this.service.getTransactions(userId);
    }

    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Patch(":id")
    update(
        @Req() req,
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateEmployeeImprestSchema))
        body: UpdateEmployeeImprestDto
    ) {
        console.log("TEST");
        console.log(id, body);
        return this.service.update(id, body, req.user as ImprestActorUser);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser("id") userId: number) {
        return this.service.delete(id, userId);
    }

    @Post(":id/approve")
    adminApprove(@Req() req, @Param("id") id: string, @Body() body: { remark?: string; approve?: boolean }) {
        return this.service.approveImprest({
            imprestId: Number(id),
            userId: req.user.sub,
        });
    }

    @Post(":id/tally")
    tallyAddImprest(@Req() req, @Param("id", ParseIntPipe) id: number) {
        return this.service.tallyAddImprest({
            imprestId: Number(id),
            userId: req.user.sub,
        });
    }

    @Post(":id/proof-approve")
    proofApprove(@Req() req, @Param("id", ParseIntPipe) id: number) {
        return this.service.proofApprove({
            imprestId: id,
            userId: req.user.sub,
        });
    }

    // File upload code
    @Post(":id/upload")
    uploadDocs(@Param("id", ParseIntPipe) id: number, @Body() body: { files?: string[] }, @CurrentUser("id") userId: number) {
        console.log("file upload begins");
        console.log("Files received:", body?.files);
        return this.service.uploadDocs(id, body?.files ?? [], userId);
    }

    @Patch(":id/account-remark")
    addAccRemark(@Param("id", ParseIntPipe) id: number, @Body () body :{remark: string}){
        return this.service.addAccountRemark(id, body.remark);
    }

    @Delete(":id/proof/:filename")
    deleteProof(
        @Param("id", ParseIntPipe) id: number,
        @Param("filename") filename: string,
        @CurrentUser("id") userId: number
    ) {
        return this.service.deleteProof(id, decodeURIComponent(filename), userId);
    }
}
