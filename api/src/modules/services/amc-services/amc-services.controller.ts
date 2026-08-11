import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
} from "@nestjs/common";
import { AmcServicesService } from "./amc-services.service";

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
    async uploadFile(
        @Param("id", ParseIntPipe) id: number,
        @Param("field") field: string,
        @Body() body: { path: string },
    ) {
        const column = REPORT_FIELDS[field];

        if (!column) {
            throw new BadRequestException(
                `Invalid upload field "${field}". Expected one of: ${Object.keys(REPORT_FIELDS).join(", ")}`,
            );
        }

        if (!body?.path) {
            throw new BadRequestException("File path is required");
        }

        return this.service.setReportPath(id, column, body.path);
    }
}
