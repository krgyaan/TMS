import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseIntPipe,
    Query
} from '@nestjs/common';
import { TqManagementService, type TqManagementFilters } from '@/modules/tendering/tq-management/tq-management.service';
import {
    CreateTqReceivedDto,
    UpdateTqRepliedDto,
    UpdateTqMissedDto,
    MarkAsNoTqDto,
    UpdateTqReceivedDto
} from './dto/tq-management.dto';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('tq-management')
export class TqManagementController {
    constructor(private readonly tqManagementService: TqManagementService) { }

    @Get()
    findAll(
        @Query('tqStatus') tqStatus?: 'TQ awaited' | 'TQ received' | 'TQ replied' | 'TQ missed' | 'No TQ',
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('sortBy') sortBy?: string,
        @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ) {
        return this.tqManagementService.findAll({
            tqStatus,
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            sortBy,
            sortOrder,
        });
    }

    @Get('counts')
    getDashboardCounts() {
        return this.tqManagementService.getDashboardCounts();
    }

    @Get('tender/:tenderId')
    findByTenderId(@Param('tenderId', ParseIntPipe) tenderId: number) {
        return this.tqManagementService.findByTenderId(tenderId);
    }

    @Get(':id/items')
    getTqItems(@Param('id', ParseIntPipe) id: number) {
        return this.tqManagementService.getTqItems(id);
    }

    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
        return this.tqManagementService.findById(id);
    }

    @Post('received')
    createTqReceived(
        @Body() dto: CreateTqReceivedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.createTqReceived({
            tenderId: dto.tenderId,
            tqSubmissionDeadline: new Date(dto.tqSubmissionDeadline),
            tqDocumentReceived: dto.tqDocumentReceived,
            receivedBy: user.sub,
            tqItems: dto.tqItems,
        });
    }

    @Patch(':id/replied')
    updateTqReplied(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqRepliedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.updateTqReplied(id, {
            repliedDatetime: new Date(dto.repliedDatetime),
            repliedDocument: dto.repliedDocument,
            proofOfSubmission: dto.proofOfSubmission,
            repliedBy: user.sub,
        });
    }

    @Patch(':id/missed')
    updateTqMissed(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqMissedDto,
        @CurrentUser() user: ValidatedUser
    ) {
        return this.tqManagementService.updateTqMissed(id, dto, user.sub);
    }

    @Post('no-tq')
    markAsNoTq(
        @Body() dto: MarkAsNoTqDto,
        @CurrentUser() user: ValidatedUser
    ) {
        // Default to qualified=true, can be extended to accept qualification status from DTO
        return this.tqManagementService.markAsNoTq(dto.tenderId, user.sub, dto.qualified ?? true);
    }

    @Patch(':id/received')
    updateTqReceived(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateTqReceivedDto
    ) {
        return this.tqManagementService.updateTqReceived(id, {
            tqSubmissionDeadline: new Date(dto.tqSubmissionDeadline),
            tqDocumentReceived: dto.tqDocumentReceived,
            tqItems: dto.tqItems,
        });
    }
}
