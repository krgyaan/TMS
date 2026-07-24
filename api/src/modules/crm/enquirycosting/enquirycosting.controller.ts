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
import { SubmitCostingSheetSchema } from './dto/enquirycosting.dto';
import type { SubmitCostingSheetDto } from './dto/enquirycosting.dto';
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

    @Post('submit-costing-sheet')
    @HttpCode(HttpStatus.OK)
    async submitCostingSheet(
        @ValidatedBody(SubmitCostingSheetSchema) body: SubmitCostingSheetDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.enquiryCostingService.submitCostingSheet(body, user.sub);
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.enquiryCostingService.findById(id);
    }
}
