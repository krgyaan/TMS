// src/modules/accounts/checklist/checklist.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    ParseIntPipe,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ZodValidationPipe } from "nestjs-zod";

import { Logger } from "winston";

import { AccountChecklistService } from "./account-checklist.service";
import { CurrentUser } from "@/decorators/current-user.decorator";
import { CanDelete } from "@/modules/auth/decorators";

import { z } from "zod";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";

// ✅ 1. Base schema (NO refine)
const BaseChecklistSchema = z.object({
    taskName: z.string().min(1).max(255),
    frequency: z.enum(["Daily", "Weekly", "Monthly", "Quarterly", "Annual"]),
    frequencyCondition: z.number().int().optional(),
    responsibility: z.string().min(1),
    accountability: z.string().min(1),
    description: z.string().optional(),
});

// ✅ 2. Create schema with refine
export const CreateChecklistSchema = BaseChecklistSchema.refine((data) => {
    if (data.frequency === "Weekly") {
        return data.frequencyCondition !== undefined &&
               data.frequencyCondition >= 0 &&
               data.frequencyCondition <= 6;
    }
    if (data.frequency === "Monthly") {
        return data.frequencyCondition !== undefined &&
               data.frequencyCondition >= 1 &&
               data.frequencyCondition <= 30;
    }
    return true;
}, {
    message: "frequencyCondition is required for Weekly (0-6) and Monthly (1-30)"
});

// ✅ 3. Update schema from BASE
export type CreateChecklistDto = z.infer<typeof CreateChecklistSchema>;

export const UpdateChecklistSchema = BaseChecklistSchema.partial();

export type UpdateChecklistDto = z.infer<typeof UpdateChecklistSchema>;

export type UpdateChecklistInput = UpdateChecklistDto;


export const ResponsibilityRemarkSchema = z.object({
    respRemark: z.string().min(1).max(1000),
});

export type ResponsibilityRemarkDto = z.infer<typeof ResponsibilityRemarkSchema>;


export const AccountabilityRemarkSchema = z.object({
    accRemark: z.string().min(1).max(1000),
});

export type AccountabilityRemarkDto = z.infer<typeof AccountabilityRemarkSchema>;

export const GetTasksSchema = z.object({
    user: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
});

export type GetTasksDto = z.infer<typeof GetTasksSchema>;

// File upload configuration
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
];

const fileFilter = (
    req: any,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void
) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(
            new BadRequestException(
                `Invalid file type: ${file.mimetype}. Allowed types: images, PDF, Word, Excel, CSV, TXT.`
            ),
            false
        );
    }
};

const checklistFileConfig = {
    storage: diskStorage({
        destination: "./uploads/checklist",
        filename: (req: any, file, callback) => {
            const userName = req.user?.name || "user";
            const taskId = req.params?.id || "new";
            const random = Math.floor(Math.random() * 900) + 100;
            const ext = extname(file.originalname);
            callback(null, `${userName}_task_${taskId}_${random}${ext}`);
        },
    }),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter,
};

@Controller("accounts/checklists")
export class AccountChecklistController {
    constructor(private readonly service: AccountChecklistService,

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    ) {}

    /**
     * Get all checklists (index view)
     */
    @Get()
    getIndex(@CurrentUser() user: any) {
        this.logger.debug(`User object: ${JSON.stringify(user, null, 2)}`);
        return this.service.getIndexData(user.sub, user.role, user.permissions);
    }

    /**
     * Get all checklists (simple list)
     */
    @Get("all")
    getAll(@CurrentUser() user: any) {
        return this.service.findAll(user.sub, user.role, user.permissions);
    }

    /**
     * Create a new checklist
     */
    @Post()
    create(
        @Body(new ZodValidationPipe(CreateChecklistSchema))
        dto: CreateChecklistDto
    ) {
        return this.service.create(dto);
    }

    /**
     * Get a single checklist by ID
     */
    @Get(":id")
    getOne(@Param("id", ParseIntPipe) id: number) {
        return this.service.findOne(id);
    }

    /**
     * Update a checklist
     */
    @Put(":id")
    update(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(UpdateChecklistSchema))
        body: UpdateChecklistInput
    ) {
        return this.service.update(id, body);
    }

    /**
     * Delete a checklist
     */
    @Delete(":id")
    @CanDelete("accounts.checklist-admin")
    delete(@Param("id", ParseIntPipe) id: number) {
        return this.service.delete(id);
    }

    /**
     * Store responsibility remark
     */
    @Post("reports/:id/responsibility-remark")
    @UseInterceptors(FileInterceptor("resp_result_file", checklistFileConfig))
    storeResponsibilityRemark(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(ResponsibilityRemarkSchema))
        dto: ResponsibilityRemarkDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @CurrentUser() user: any
    ) {
        return this.service.storeResponsibilityRemark(id, dto, file, user.sub);
    }

    /**
     * Store accountability remark
     */
    @Post("reports/:id/accountability-remark")
    @UseInterceptors(FileInterceptor("acc_result_file", checklistFileConfig))
    storeAccountabilityRemark(
        @Param("id", ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(AccountabilityRemarkSchema))
        dto: AccountabilityRemarkDto,
        @UploadedFile() file: Express.Multer.File | undefined,
        @CurrentUser() user: any
    ) {
        return this.service.storeAccountabilityRemark(id, dto, file, user.sub);
    }

    /**
     * Get tasks for report view
     */
    @Get("reports/tasks")
    getTasks(@Query(new ZodValidationPipe(GetTasksSchema)) query: GetTasksDto) {
        return this.service.getTasks(query);
    }
}