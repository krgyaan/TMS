import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { TenderInfosService } from '@/modules/tendering/tenders/tenders.service';
import { NewTenderInfo } from '@db/schemas/tendering/tenders.schema';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

// Reusable decimal field transformer
const decimalField = (message: string, required = true) => {
    const schema = z.coerce
        .number()
        .nonnegative(message)
        .transform((val) => val.toString());

    return required ? schema : schema.optional();
};

const CreateTenderInfoSchema = z.object({
    team: z.coerce.number().int().positive("Team is required"),
    tenderNo: z.string().min(1, "Tender number is required").max(255),
    organization: z.coerce.number().int().positive().optional(),
    tenderName: z.string().min(1, "Tender name is required").max(255),
    item: z.coerce.number().int().positive("Item is required"),

    gstValues: decimalField("GST value must be positive").default(0.00),
    tenderFees: decimalField("Tender fees must be positive").default(0.00),
    emd: decimalField("EMD must be positive").default(0.00),

    teamMember: z.coerce.number().int().positive().nullable().optional(),
    dueDate: z.string().min(1, "Due date is required").transform((val) => new Date(val)),

    remarks: z.string().max(200).optional(),
    status: z.coerce.number().int().min(0, "Invalid status").default(0),

    location: z.coerce.number().int().positive().optional(),
    website: z.coerce.number().int().positive().optional(),

    deleteStatus: z.coerce.number().int().min(0, "Invalid delete status").default(0).optional(),
    tlStatus: z.coerce.number().int().min(0, "Invalid TL status").default(0).optional(),
    tlRemarks: z.string().max(200).optional(),
    rfqTo: z.string().max(15).optional(),
    courierAddress: z.string().optional(),
});

const UpdateTenderInfoSchema = z.object({
    team: z.coerce.number().int().positive("Team is required").optional(),
    tenderNo: z.string().min(1, "Tender number is required").max(255).optional(),
    organization: z.coerce.number().int().positive().optional(),
    tenderName: z.string().min(1, "Tender name is required").max(255).optional(),
    item: z.coerce.number().int().positive("Item is required").optional(),

    gstValues: decimalField("GST value must be positive", false),
    tenderFees: decimalField("Tender fees must be positive", false),
    emd: decimalField("EMD must be positive", false),

    teamMember: z.coerce.number().int().positive().nullable().optional(),
    dueDate: z.string().min(1, "Due date is required").transform((val) => new Date(val)).optional(),

    remarks: z.string().max(200).optional(),
    status: z.coerce.number().int().min(0, "Invalid status").optional(),

    location: z.coerce.number().int().positive().optional(),
    website: z.coerce.number().int().positive().optional(),

    deleteStatus: z.coerce.number().int().min(0, "Invalid delete status").default(0).optional(),
    tlStatus: z.coerce.number().int().min(0, "Invalid TL status").default(0).optional(),
    tlRemarks: z.string().max(200).optional(),
    rfqTo: z.string().max(15).optional(),
    courierAddress: z.string().optional(),

    // Approval fields
    tenderFeeMode: z.string().max(50).optional(),
    emdMode: z.string().max(50).optional(),
    approvePqrSelection: z.string().max(50).optional(),
    approveFinanceDocSelection: z.string().max(50).optional(),
    tenderApprovalStatus: z.string().max(50).optional(),
    oemNotAllowed: z.string().optional(),
    tlRejectionRemarks: z.string().optional(),
});

const SaveTenderApprovalSchema = z.object({
    tlStatus: z.coerce.number().int().min(0, "Invalid TL status").default(0),
    rfqTo: z.string().max(15).optional(),
    tenderFeeMode: z.string().max(50).optional(),
    emdMode: z.string().max(50).optional(),
    approvePqrSelection: z.string().max(50).optional(),
    approveFinanceDocSelection: z.string().max(50).optional(),
    tenderApprovalStatus: z.string().max(50).optional(),
    oemNotAllowed: z.string().optional(),
    tlRejectionRemarks: z.string().optional(),
});

const UpdateStatusSchema = z.object({
    status: z.coerce.number().int().positive('Status must be a positive number'),
    comment: z.string().min(1, 'Comment is required'),
});

const GenerateTenderNameSchema = z.object({
    organization: z.coerce.number().int().positive("Organization is required"),
    item: z.coerce.number().int().positive("Item is required"),
    location: z.coerce.number().int().positive().optional(),
});

type CreateTenderDto = z.infer<typeof CreateTenderInfoSchema>;
type UpdateTenderDto = z.infer<typeof UpdateTenderInfoSchema>;

@Controller('tenders')
export class TenderInfoController {
    constructor(private readonly tenderInfosService: TenderInfosService) { }

    @Get()
    async list(
        @Query('statusIds') statusIds?: string,
        @Query('unallocated') unallocated?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
        @Query('teamId') teamId?: string,
        @Query('assignedTo') assignedTo?: string,
    ) {
        const toNumArray = (v?: string) =>
            (v ?? '')
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !Number.isNaN(n));

        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        return this.tenderInfosService.findAll({
            statusIds: toNumArray(statusIds),
            unallocated: unallocated === 'true' || unallocated === '1',
            page: parseNumber(page),
            limit: parseNumber(limit),
            search,
            teamId: parseNumber(teamId),
            assignedTo: parseNumber(assignedTo),
        });
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        const tender = await this.tenderInfosService.findById(id);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
        return tender;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const parsed = CreateTenderInfoSchema.parse(body);
        return this.tenderInfosService.create(parsed);
    }

    @Patch(':id')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
        const parsed = UpdateTenderInfoSchema.parse(body);
        return this.tenderInfosService.update(id, parsed as unknown as Partial<NewTenderInfo>);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.tenderInfosService.delete(id);
    }

    @Get(':id/approval')
    async getApproval(@Param('id', ParseIntPipe) id: number) {
        const tender = await this.tenderInfosService.findById(id);
        if (!tender) {
            throw new NotFoundException(`Tender with ID ${id} not found`);
        }
        return this.tenderInfosService.getApprovalData(tender);
    }

    @Put(':id/approval')
    async updateApproval(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown
    ) {
        const parsed = SaveTenderApprovalSchema.parse(body);
        return this.tenderInfosService.updateApproval(id, parsed);
    }

    /**
     * Manual status update endpoint
     * Requires status ID and comment
     */
    @Patch(':id/status')
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: unknown,
        @CurrentUser() user: ValidatedUser
    ) {
        const parsed = UpdateStatusSchema.parse(body);
        return this.tenderInfosService.updateStatus(
            id,
            parsed.status,
            user.sub,
            parsed.comment
        );
    }

    /**
     * Generate tender name based on organization, item, and location
     */
    @Post('generate-name')
    async generateName(@Body() body: unknown) {
        const parsed = GenerateTenderNameSchema.parse(body);
        return this.tenderInfosService.generateTenderName(
            parsed.organization,
            parsed.item,
            parsed.location
        );
    }
}
