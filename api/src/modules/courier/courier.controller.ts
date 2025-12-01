// src/modules/courier/courier.controller.ts
import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, ParseIntPipe, UseInterceptors, UploadedFiles, UploadedFile } from "@nestjs/common";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { CourierService } from "./courier.service";
import type { CreateCourierDto } from "./zod/create-courier.schema";
import type { UpdateCourierDto } from "./zod/update-courier.schema";
import { CurrentUser } from "../../decorators/current-user.decorator";

// Multer config
const multerConfig = {
    storage: diskStorage({
        destination: "./uploads/couriers",
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

const podMulterConfig = {
    storage: diskStorage({
        destination: "./uploads/couriers/pod",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `pod-${uniqueSuffix}${ext}`);
        },
    }),
};

@Controller("couriers")
export class CourierController {
    constructor(private readonly service: CourierService) {}

    @Post()
    create(@Body() body: CreateCourierDto, @CurrentUser("id") userId: number) {
        return this.service.create(body, userId);
    }

    // Get all couriers for logged-in user
    @Get()
    getMyCouriers(@CurrentUser("id") userId: number) {
        return this.service.findAllByUser(userId);
    }

    // Get all couriers (admin/dashboard)
    @Get("all")
    getAllCouriers() {
        return this.service.findAll();
    }

    // Get couriers grouped by status (for dashboard tabs)
    @Get("dashboard")
    getDashboardData() {
        return this.service.findAllGroupedByStatus();
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
    update(@Param("id", ParseIntPipe) id: number, @Body() body: UpdateCourierDto, @CurrentUser("id") userId: number) {
        return this.service.update(id, body, userId);
    }

    // Update status
    @Patch(":id/status")
    updateStatus(
        @Param("id", ParseIntPipe) id: number,
        @Body()
        body: {
            status: number;
            delivery_date?: string;
            within_time?: boolean;
        },
        @CurrentUser("id") userId: number
    ) {
        return this.service.updateStatus(id, body, userId);
    }

    // Update dispatch info
    @Patch(":id/dispatch")
    updateDispatch(
        @Param("id", ParseIntPipe) id: number,
        @Body()
        body: {
            courier_provider: string;
            docket_no: string;
            pickup_date: string;
        },
        @CurrentUser("id") userId: number
    ) {
        return this.service.updateDispatch(id, body, userId);
    }

    @Delete(":id")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser("id") userId: number) {
        return this.service.delete(id, userId);
    }

    @Post(":id/upload")
    @UseInterceptors(FilesInterceptor("courier_docs[]", 10, multerConfig))
    uploadDocs(@Param("id", ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @CurrentUser("id") userId: number) {
        return this.service.uploadDocs(id, files, userId);
    }

    @Post(":id/upload-pod")
    @UseInterceptors(FileInterceptor("delivery_pod", podMulterConfig))
    uploadDeliveryPod(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser("id") userId: number) {
        return this.service.uploadDeliveryPod(id, file, userId);
    }
}
