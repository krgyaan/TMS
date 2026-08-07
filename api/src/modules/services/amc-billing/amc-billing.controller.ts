import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UploadedFiles,
    UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { mkdirSync } from "fs";
import { AmcBillingService } from "./amc-billing.service";

const uploadsDir = join(process.cwd(), "uploads", "amc-billing");
mkdirSync(uploadsDir, { recursive: true });

const amcBillingMulterConfig = {
    storage: diskStorage({
        destination: uploadsDir,
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

@Controller("amc-billing")
export class AmcBillingController {
    constructor(private readonly service: AmcBillingService) {}

    @Get("bills")
    list(@Query("amcId") amcId?: string) {
        return this.service.list(amcId ? Number(amcId) : undefined);
    }

    @Get("bills/:id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post("bills/:id/invoices")
    @UseInterceptors(FilesInterceptor("files", 10, amcBillingMulterConfig))
    async addInvoices(
        @Param("id", ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException("At least one file is required");
        }
        const filePaths = files.map(f => f.filename);
        return this.service.addInvoices(id, filePaths);
    }

    @Post("bills/:id/receipts")
    @UseInterceptors(FilesInterceptor("files", 10, amcBillingMulterConfig))
    async addReceipts(
        @Param("id", ParseIntPipe) id: number,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException("At least one file is required");
        }
        const filePaths = files.map(f => f.filename);
        return this.service.addReceipts(id, filePaths);
    }

    @Delete("bills/:id/invoices/:index")
    async removeInvoice(
        @Param("id", ParseIntPipe) id: number,
        @Param("index", ParseIntPipe) index: number,
    ) {
        return this.service.removeInvoice(id, index);
    }

    @Delete("bills/:id/receipts/:index")
    async removeReceipt(
        @Param("id", ParseIntPipe) id: number,
        @Param("index", ParseIntPipe) index: number,
    ) {
        return this.service.removeReceipt(id, index);
    }

    @Post("bills/:id/followup")
    followup(@Param("id", ParseIntPipe) id: number) {
        return this.service.followup(id);
    }
}