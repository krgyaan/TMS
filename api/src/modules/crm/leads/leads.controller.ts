import {
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import {
    CreateLeadSchema,
    UpdateLeadSchema,
    AllocateLeadSchema,
    DeleteLeadSchema,
} from './dto/lead.dto';
import { ValidatedBody } from '@/decorators/validated-body.decorator';
import type {
    CreateLeadDto,
    UpdateLeadDto,
    AllocateLeadDto,
    DeleteLeadDto,
} from './dto/lead.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('leads')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Get()
    async list(
        @Query('page')      page?:      string,
        @Query('limit')     limit?:     string,
        @Query('search')    search?:    string,
        @Query('priority')  priority?:  string,
        @Query('status')    status?:    string,
        @Query('team')      team?:      string,   
        @Query('sortBy')    sortBy?:    string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        const parseNumber = (v?: string): number | undefined => {
            if (!v) return undefined;
            const num = parseInt(v, 10);
            return Number.isNaN(num) ? undefined : num;
        };

        return this.leadsService.findAll({
            page: parseNumber(page),
            limit: parseNumber(limit),
            search,
            priority,
            status,
            team,                                  // ✅ ADD THIS
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        });
    }

    @Get(':id')
    async getById(@Param('id', ParseIntPipe) id: number) {
        return this.leadsService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @ValidatedBody(CreateLeadSchema) body: CreateLeadDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadsService.create(body, user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(UpdateLeadSchema) body: UpdateLeadDto,
    ) {
        return this.leadsService.update(id, body);
    }

    @Patch(':id/allocate')
    async allocate(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(AllocateLeadSchema) body: AllocateLeadDto,
        @CurrentUser() user: ValidatedUser,
    ) {
        return this.leadsService.allocate(id, body, user.sub);
    }

    @Patch(':id/disqualify')
    @HttpCode(HttpStatus.NO_CONTENT)
    async disqualify(
        @Param('id', ParseIntPipe) id: number,
        @ValidatedBody(DeleteLeadSchema) body: DeleteLeadDto,
    ) {
        await this.leadsService.delete(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id', ParseIntPipe) id: number) {
        await this.leadsService.delete(id);
    }
}