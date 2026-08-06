import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { mkdirSync } from "fs";
import { ZodValidationPipe } from "nestjs-zod";
import { AmcBillingService } from "./amc-billing.service";
import {
    CreateAmcBillingSchema,
    UpdateAmcBillingSchema,
} from "./dto/amc-billing.dto";

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

const BILLING_PATH_FIELDS: Record<string, "invoice" | "paymentReceipt"> = {
    "invoice": "invoice",
    "payment-receipt": "paymentReceipt",
};

@Controller("amc-billing")
export class AmcBillingController {
    constructor(private readonly service: AmcBillingService) {}

    @Get()
    list(@Query("amcId") amcId?: string) {
        return this.service.list(amcId ? Number(amcId) : undefined);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(CreateAmcBillingSchema)) body: any) {
        return this.service.create(body);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateAmcBillingSchema)) body: any,
    ) {
        return this.service.update(id, body);
    }

    @Post(":id/upload/:field")
    @UseInterceptors(FileInterceptor("file", amcBillingMulterConfig))
    async uploadFile(
        @Param("id", ParseIntPipe) id: number,
        @Param("field") field: string,
        @UploadedFile() file: Express.Multer.File | undefined,
    ) {
        const column = BILLING_PATH_FIELDS[field];

        if (!column) {
            throw new BadRequestException(
                `Invalid upload field "${field}". Expected one of: ${Object.keys(BILLING_PATH_FIELDS).join(", ")}`,
            );
        }

        if (!file) {
            throw new BadRequestException("File is required");
        }

        return this.service.setFilePath(id, column, file.filename);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }
}
