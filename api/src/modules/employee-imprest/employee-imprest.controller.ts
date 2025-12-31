import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException, Req } from "@nestjs/common";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { EmployeeImprestService } from "@/modules/employee-imprest/employee-imprest.service";
import type { CreateEmployeeImprestDto } from "@/modules/employee-imprest/zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "@/modules/employee-imprest/zod/update-employee-imprest.schema";
import { CurrentUser } from "@/decorators/current-user.decorator";

// Multer config
const multerConfig = {
    storage: diskStorage({
        destination: "./uploads/employeeimprest",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `imp-${uniqueSuffix}${ext}`);
        },
    }),
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
};
@Controller("employee-imprest")
export class EmployeeImprestController {
    constructor(private readonly service: EmployeeImprestService) {}

    @Post()
    @UseInterceptors(FilesInterceptor("files", 10, multerConfig))
    create(@Body() body: CreateEmployeeImprestDto, @UploadedFiles() files: Express.Multer.File[], @CurrentUser("id") userId: number) {
        let data = this.service.create(body, files, userId);
        console.log("Created Employee Imprest:", data);
        return data;
    }

    @Get()
    getMyImprests(@Req() req) {
        return this.service.findAllByUser(req.user.sub);
    }

    @Get("user/:userId")
    getByUser(@Param("userId", ParseIntPipe) userId: number) {
        console.log("Fetching imprests for userId (controller):", userId);
        return this.service.findAllByUser(userId);
    }

    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    @Put(":id")
    update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateEmployeeImprestDto, @CurrentUser("id") userId: number) {
        return this.service.update(id, body, userId);
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
    @UseInterceptors(FilesInterceptor("files", 10, multerConfig))
    uploadDocs(@Param("id", ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @CurrentUser("id") userId: number) {
        console.log("file upload begins");
        console.log("Files received:", files);
        return this.service.uploadDocs(id, files, userId);
    }
}
