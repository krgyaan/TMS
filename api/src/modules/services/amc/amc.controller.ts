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
    Req,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ZodValidationPipe } from "nestjs-zod";
import { AmcService } from "./amc.service";
import { CreateAmcSchema, UpdateAmcSchema } from "./dto/amc.dto";
import { AmcBillingService } from "@/modules/services/amc-billing/amc-billing.service";

const amcMulterConfig = {
    storage: diskStorage({
        destination: "./uploads/amc",
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

const AMC_PATH_FIELDS: Record<string, { field: "amcPoPath" | "serviceReportPath" | "signedServiceReportPath"; subKey?: "sample" | "filled" }> = {
    "po": { field: "amcPoPath" },
    "service-report": { field: "serviceReportPath", subKey: "sample" },
    "filled-service-report": { field: "serviceReportPath", subKey: "filled" },
    "signed-service-report": { field: "signedServiceReportPath" },
};

@Controller("amc")
export class AmcController {
    constructor(
        private readonly service: AmcService,
        private readonly billingService: AmcBillingService,
    ) {}

    @Get()
    list(@Query("projectId") projectId?: string) {
        return this.service.list(projectId ? Number(projectId) : undefined);
    }

    @Get(":id")
    getById(@Param("id", ParseIntPipe) id: number) {
        return this.service.getById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(CreateAmcSchema)) body: any, @Req() req: any) {
        return this.service.create(body, req.user?.id ?? req.user?.sub);
    }

    @Put(":id")
    @HttpCode(HttpStatus.OK)
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateAmcSchema)) body: any,
    ) {
        return this.service.update(id, body);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    remove(@Param("id", ParseIntPipe) id: number) {
        return this.service.remove(id);
    }

    @Post(":id/upload/:field")
    @UseInterceptors(FileInterceptor("file", amcMulterConfig))
    async uploadFile(
        @Param("id", ParseIntPipe) id: number,
        @Param("field") field: string,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Query("amcSiteId") amcSiteId?: string,
    ) {
        const config = AMC_PATH_FIELDS[field];

        if (!config) {
            throw new BadRequestException(
                `Invalid upload field "${field}". Expected one of: ${Object.keys(AMC_PATH_FIELDS).join(", ")}`,
            );
        }

        if (!file) {
            throw new BadRequestException("File is required");
        }

        const updated = await this.service.setFilePath(id, config.field, file.filename, config.subKey);

        if (field === "signed-service-report") {
            await this.billingService.create({
                amcId: id,
                amcSiteId: amcSiteId ? Number(amcSiteId) : null,
                serviceCompletedDate: new Date().toISOString(),
            });
        }

        return updated;
    }
}