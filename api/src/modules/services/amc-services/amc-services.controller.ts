import {
    BadRequestException,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { mkdirSync } from "fs";
import { AmcServicesService } from "./amc-services.service";

const uploadsDir = join(process.cwd(), "uploads", "amc-services");
mkdirSync(uploadsDir, { recursive: true });

const amcServicesMulterConfig = {
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

const REPORT_FIELDS: Record<string, "filledReport" | "signedReport"> = {
    "filled-service-report": "filledReport",
    "signed-service-report": "signedReport",
};

@Controller("amc-services")
export class AmcServicesController {
    constructor(private readonly service: AmcServicesService) {}

    @Get()
    list(
        @Query("amcId") amcId?: string,
        @Query("siteId") siteId?: string,
    ) {
        return this.service.list(
            amcId ? Number(amcId) : undefined,
            siteId ? Number(siteId) : undefined,
        );
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post(":id/upload/:field")
    @UseInterceptors(FileInterceptor("file", amcServicesMulterConfig))
    async uploadFile(
        @Param("id", ParseIntPipe) id: number,
        @Param("field") field: string,
        @UploadedFile() file: Express.Multer.File | undefined,
    ) {
        const column = REPORT_FIELDS[field];

        if (!column) {
            throw new BadRequestException(
                `Invalid upload field "${field}". Expected one of: ${Object.keys(REPORT_FIELDS).join(", ")}`,
            );
        }

        if (!file) {
            throw new BadRequestException("File is required");
        }

        return this.service.setReportPath(id, column, file.filename);
    }
}
