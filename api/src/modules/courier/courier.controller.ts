// src/modules/courier/courier.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    ParseIntPipe,
    UseInterceptors,
    UploadedFiles,
    UploadedFile,
    BadRequestException,
    Req,
} from "@nestjs/common";
import { FilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";

import { CourierService } from "@/modules/courier/courier.service";
import type { CreateCourierDto } from "@/modules/courier/zod/create-courier.schema";
import { type UpdateCourierInput, UpdateCourierSchema, type UpdateCourierDto } from "@/modules/courier/zod/update-courier.schema";
import { CurrentUser } from "@/decorators/current-user.decorator";

import { CreateDispatchSchema } from "./zod/dispatch-courier.schema";
import { ZodValidationPipe } from "nestjs-zod";
import { UpdateCourierStatusSchema } from "./zod/update-courier-status.schema";
import { CanDelete } from "../auth/decorators";

// Allowed file types
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed types: images, PDF, Word documents.`), false);
    }
};

// $statusMap = [
//     'dispatched' => ['1'],
//     'not_delivered' => ['2', '3'],
//     'delivered' => ['4'],
//     'rejected' => ['5'],
// ];

// Multer config
const multerConfig = {
    storage: diskStorage({
        destination: "./uploads/courier",
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
        destination: "./uploads/courier",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `pod-${uniqueSuffix}${ext}`);
        },
    }),
};

// Multer config for docket slip
const docketSlipMulterConfig = {
    storage: diskStorage({
        destination: "./uploads/courier",
        filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            callback(null, `docket-${uniqueSuffix}${ext}`);
        },
    }),
    limits: {
        fileSize: 25 * 1024 * 1024,
    },
    fileFilter,
};

@Controller("couriers")
export class CourierController {
    constructor(private readonly service: CourierService) {}

    @Post()
    @UseInterceptors(FilesInterceptor("courierDocs[]", 10, multerConfig))
    create(@Body() dto, @UploadedFiles() files: Express.Multer.File[], @Req() req) {
        console.log("dto", dto);
        return this.service.create(dto, files, req.user.sub);
    }

    @Post(":id/dispatch")
    @UseInterceptors(FileInterceptor("docketSlip", docketSlipMulterConfig))
    createDispatch(@Param("id", ParseIntPipe) id: number, @Req() req: Request, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser("id") userId: number) {
        const parsed = CreateDispatchSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        console.log("createDispatch parsed body:", parsed.data);

        return this.service.createDispatch(id, parsed.data, file, userId);
    }

    // Update dispatch info
    @Patch(":id/dispatch")
    updateDispatch(
        @Param("id", ParseIntPipe) id: number,
        @Body()
        @Req()
        req: Request,
        @CurrentUser("id") userId: number
    ) {
        const parsed = CreateDispatchSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        console.log("createDispatch parsed body:", parsed.data);

        return this.service.updateDispatch(id, parsed.data, userId);
    }

    // Get all couriers for logged-in user
    @Get()
    getMyCouriers(@CurrentUser("id") userId: number) {
        return this.service.findAllByUser(userId);
    }

    // Get all couriers (admin/dashboard)
    @Get("all")
    getAllCouriers() {
        // return "Hey";
        console.log("getAllCouriers called");
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
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateCourierSchema))
        body: UpdateCourierInput,
        @CurrentUser("id") userId: number
    ) {
        return this.service.update(id, body, userId);
    }

    // Update status
    @Patch(":id/status")
    @UseInterceptors(FileInterceptor("podDoc", podMulterConfig))
    updateStatus(@Param("id", ParseIntPipe) id: number, @Req() req: Request, @UploadedFile() file: Express.Multer.File | undefined) {
        const parsed = UpdateCourierStatusSchema.safeParse(req.body);

        if (!parsed.success) {
            throw new BadRequestException(parsed.error.flatten());
        }

        return this.service.updateStatus(id, parsed.data, file);
    }

    @Delete(":id")
    @CanDelete("shared.couriers")
    delete(@Param("id", ParseIntPipe) id: number, @CurrentUser("id") userId: number) {
        return this.service.delete(id, userId);
    }

    @Post(":id/upload")
    @UseInterceptors(FilesInterceptor("courierDocs[]", 10, multerConfig))
    uploadDocs(@Param("id", ParseIntPipe) id: number, @UploadedFiles() files: Express.Multer.File[], @CurrentUser("id") userId: number) {
        return this.service.uploadDocs(id, files, userId);
    }

    @Post(":id/upload-pod")
    @UseInterceptors(FileInterceptor("deliveryPod", podMulterConfig))
    uploadDeliveryPod(@Param("id", ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File, @CurrentUser("id") userId: number) {
        return this.service.uploadDeliveryPod(id, file, userId);
    }
}
