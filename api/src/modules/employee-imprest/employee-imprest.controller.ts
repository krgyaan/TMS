import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseInterceptors, UploadedFiles, UploadedFile, BadRequestException } from "@nestjs/common";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { EmployeeImprestService } from "./employee-imprest.service";
import type { CreateEmployeeImprestDto } from "./zod/create-employee-imprest.schema";
import type { UpdateEmployeeImprestDto } from "./zod/update-employee-imprest.schema";
import { CurrentUser } from "../../decorators/current-user.decorator";

// Multer config
const multerConfig = {
    storage: diskStorage({
        destination: "./uploads/employee-imprest",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `${uniqueSuffix}${ext}`);
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
    create(@Body() body: CreateEmployeeImprestDto, @CurrentUser("id") userId: number) {
        return this.service.create(body, userId);
    }

    @Get()
    getMyImprests(@CurrentUser("id") userId: number) {
        return this.service.findAllByUser(userId);
    }

    @Get("user/:userId")
    getByUser(@Param("userId", ParseIntPipe) userId: number) {
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

    // File upload code
    @Post(":id/upload")
    @UseInterceptors(FilesInterceptor("invoice_proof[]", 10, multerConfig))
    uploadDocs(@Param("id", ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @CurrentUser("id") userId: number) {
        console.log("file upload begins");
        return this.service.uploadDocs(id, files, userId);
    }
}
