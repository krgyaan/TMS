import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { EnquiryCostingService } from './enquirycosting.service';
import {
    SubmitCostingSheetSchema,
    ResubmitCostingSheetSchema,
    ApproveCostingSheetSchema,
    RedoCostingSheetSchema,
    RejectEnquirySchema,
} from './dto/enquirycosting.dto';
import type {
    SubmitCostingSheetDto,
    ResubmitCostingSheetDto,
    ApproveCostingSheetDto,
    RedoCostingSheetDto,
    RejectEnquiryDto,
} from './dto/enquirycosting.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('enquiry-costings')
export class EnquiryCostingController {
    constructor(private readonly enquiryCostingService: EnquiryCostingService) {}

    @Get()
    async list(
        @Query('page')      page?:      string,
        @Query('limit')     limit?:     string,
        @Query('search')    search?:    string,
        @Query('status')    status?:    string,
        @Query('sortBy')    sortBy?:    string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        return this.enquiryCostingService.findAll({
            page: parseNumber(page),
            limit: parseNumber(limit),
            search,
            status,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        });
    }

    @Get('by-enquiry/:enquiryId')
    async getByEnquiry(@Param('enquiryId', ParseIntPipe) enquiryId: number) {
        return this.enquiryCostingService.findByEnquiryId(enquiryId);
    }

    @Post('submit-costing-sheet')
    @HttpCode(HttpStatus.OK)
    async submitCostingSheet(
        @ValidatedBody(SubmitCostingSheetSchema) body: SubmitCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.submitCostingSheet(body, user.sub);
    }

    @Post('resubmit-costing-sheet')
    @HttpCode(HttpStatus.OK)
    async resubmitCostingSheet(
        @ValidatedBody(ResubmitCostingSheetSchema) body: ResubmitCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.resubmitCostingSheet(body, user.sub);
    }

    @Post(':id/approve')
    @HttpCode(HttpStatus.OK)
    async approveCosting(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(ApproveCostingSheetSchema) body: ApproveCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.approveCosting(id, body, user.sub);
    }

    @Post(':id/redo')
    @HttpCode(HttpStatus.OK)
    async redoCosting(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(RedoCostingSheetSchema) body: RedoCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.redoCosting(id, body, user.sub);
    }

    @Post(':id/reject')
    @HttpCode(HttpStatus.OK)
    async rejectEnquiry(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(RejectEnquirySchema) body: RejectEnquiryDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.rejectEnquiry(id, body, user.sub);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.enquiryCostingService.findById(id);
    }
}
